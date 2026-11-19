#pragma once

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")
typedef int socklen_t;
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <arpa/inet.h>
#define closesocket close
typedef int SOCKET;
#define INVALID_SOCKET -1
#define SOCKET_ERROR -1
#endif

#include "../auth/AuthManager.hpp"
#include "../game/RoomManager.hpp"
#include "../storage/BinaryStorage.hpp"
#include <string>
#include <sstream>
#include <thread>
#include <atomic>
#include <iostream>
#include <functional>
#include <unordered_map>
#include <vector>

namespace Network {

class SimpleJson {
public:
    static std::string get_string(const std::string& json, const std::string& key) {
        std::string pattern = "\"" + key + "\":\"";
        size_t start = json.find(pattern);
        if (start == std::string::npos) {
            pattern = "\"" + key + "\": \"";
            start = json.find(pattern);
            if (start == std::string::npos) return "";
        }
        start += pattern.length();
        size_t end = json.find("\"", start);
        if (end == std::string::npos) return "";
        return json.substr(start, end - start);
    }

    static int get_int(const std::string& json, const std::string& key, int default_val = 0) {
        std::string pattern = "\"" + key + "\":";
        size_t start = json.find(pattern);
        if (start == std::string::npos) {
            pattern = "\"" + key + "\": ";
            start = json.find(pattern);
            if (start == std::string::npos) return default_val;
        }
        start += pattern.length();
        while (start < json.length() && (json[start] == ' ' || json[start] == '\t')) start++;
        size_t end = start;
        while (end < json.length() && (isdigit(json[end]) || json[end] == '-')) end++;
        if (start == end) return default_val;
        try {
            return std::stoi(json.substr(start, end - start));
        } catch (...) {
            return default_val;
        }
    }

    static bool get_bool(const std::string& json, const std::string& key, bool default_val = false) {
        size_t pos = json.find("\"" + key + "\":");
        if (pos == std::string::npos) return default_val;
        size_t tpos = json.find("true", pos);
        size_t fpos = json.find("false", pos);
        if (tpos != std::string::npos && (fpos == std::string::npos || tpos < fpos)) return true;
        return false;
    }
};

class HttpServer {
private:
    int port;
    std::atomic<bool> running;
    SOCKET server_fd;
    Security::AuthManager& auth;
    Storage::BinaryStore& store;
    Game::RoomManager& room_mgr;

    // Rate limiter tracking: UserID -> (Timestamp Window, Action Count)
    std::unordered_map<uint64_t, std::pair<uint64_t, uint32_t>> rate_limiter_map;
    std::mutex rate_limit_mutex;

    bool check_rate_limit(uint64_t user_id, uint32_t max_x, uint32_t window_y_sec) {
        std::lock_guard<std::mutex> lock(rate_limit_mutex);
        uint64_t now_sec = Security::current_time_ms() / 1000;
        auto& entry = rate_limiter_map[user_id];
        if (now_sec - entry.first >= window_y_sec) {
            entry.first = now_sec;
            entry.second = 1;
            return true;
        }
        if (entry.second >= max_x) {
            return false; // Rate limit exceeded!
        }
        entry.second++;
        return true;
    }

    void handle_client(SOCKET client_socket) {
        char buffer[8192] = {0};
        int bytes_read = recv(client_socket, buffer, sizeof(buffer) - 1, 0);
        if (bytes_read <= 0) {
            closesocket(client_socket);
            return;
        }

        std::string req(buffer, bytes_read);
        std::istringstream req_stream(req);
        std::string method, path, proto;
        req_stream >> method >> path >> proto;

        std::string body = "";
        size_t body_pos = req.find("\r\n\r\n");
        if (body_pos != std::string::npos) {
            body = req.substr(body_pos + 4);
        }

        // Handle CORS Pre-flight OPTIONS
        if (method == "OPTIONS") {
            std::string resp = 
                "HTTP/1.1 204 No Content\r\n"
                "Access-Control-Allow-Origin: *\r\n"
                "Access-Control-Allow-Methods: GET, POST, PUT, PATCH, OPTIONS\r\n"
                "Access-Control-Allow-Headers: Content-Type, Authorization\r\n\r\n";
            send(client_socket, resp.c_str(), static_cast<int>(resp.length()), 0);
            closesocket(client_socket);
            return;
        }

        std::string status_code = "200 OK";
        std::string resp_body = "{}";

        // Read active config for limits and locks
        ConfigRecord cfg;
        store.load_config(cfg);

        // --- HEALTH & METRICS ---
        if (path == "/health" || path == "/ready") {
            resp_body = "{\"status\":\"healthy\",\"server\":\"TacticalWarfare_C++17\",\"time\":" + 
                        std::to_string(Security::current_time_ms()) + ",\"lock\":" + std::to_string(cfg.game_lock_state) + "}";
        } 
        // --- AUTHENTICATION ---
        else if (method == "POST" && path == "/api/auth/register") {
            std::string u = SimpleJson::get_string(body, "username");
            std::string p = SimpleJson::get_string(body, "password");
            AccountRecord acc;
            ProfileRecord prof;
            std::string err;
            if (auth.register_user(u, p, acc, prof, err)) {
                resp_body = "{\"success\":true,\"user_id\":" + std::to_string(acc.user_id) + ",\"username\":\"" + u + "\"}";
            } else {
                status_code = "400 Bad Request";
                resp_body = "{\"success\":false,\"error\":\"" + err + "\"}";
            }
        } else if (method == "POST" && path == "/api/auth/login") {
            std::string u = SimpleJson::get_string(body, "username");
            std::string p = SimpleJson::get_string(body, "password");
            AccountRecord acc;
            ProfileRecord prof;
            std::string token, err;
            if (auth.authenticate(u, p, acc, prof, token, err)) {
                resp_body = "{\"success\":true,\"token\":\"" + token + "\",\"user\":{\"id\":" + std::to_string(acc.user_id) +
                            ",\"username\":\"" + u + "\",\"display_name\":\"" + std::string(prof.display_name) +
                            "\",\"elo\":" + std::to_string(prof.elo) + ",\"is_admin\":" + (acc.is_admin ? "true" : "false") + "}}";
            } else {
                status_code = "401 Unauthorized";
                resp_body = "{\"success\":false,\"error\":\"" + err + "\"}";
            }
        } 
        // --- MATCHMAKING (8 BALL POOL STYLE) ---
        else if (method == "POST" && path == "/api/matchmaking/queue") {
            int uid = SimpleJson::get_int(body, "user_id");
            std::string uname = SimpleJson::get_string(body, "username");
            int elo = SimpleJson::get_int(body, "elo", 1000);
            int mode = SimpleJson::get_int(body, "mode", 1);
            room_mgr.queue_player(uid, uname, elo, mode);
            resp_body = "{\"success\":true,\"status\":\"SEARCHING_FOR_OPPONENT\"}";
        } else if (method == "POST" && path == "/api/matchmaking/cancel") {
            int uid = SimpleJson::get_int(body, "user_id");
            room_mgr.cancel_queue(uid);
            resp_body = "{\"success\":true,\"status\":\"CANCELLED\"}";
        } else if (method == "GET" && path.find("/api/matchmaking/status") != std::string::npos) {
            int uid = 0;
            size_t upos = path.find("user_id=");
            if (upos != std::string::npos) uid = std::stoi(path.substr(upos + 8));
            std::string matched_room, matched_role;
            uint64_t elapsed_sec = 0;
            bool matched = room_mgr.poll_match(uid, matched_room, matched_role, elapsed_sec);
            if (matched) {
                auto r = room_mgr.get_room(matched_room);
                resp_body = "{\"matched\":true,\"room_id\":\"" + matched_room + "\",\"role\":\"" + matched_role +
                            "\",\"opponent\":\"" + (matched_role == "PLANT" ? r->player2_name : r->player1_name) +
                            "\",\"opponent_elo\":" + std::to_string(matched_role == "PLANT" ? r->player2_elo : r->player1_elo) + "}";
            } else {
                resp_body = "{\"matched\":false,\"elapsed_sec\":" + std::to_string(elapsed_sec) + "}";
            }
        }
        // --- PRIVATE ROOMS (CODES & PRE-GAME LOBBY) ---
        else if (method == "POST" && path == "/api/rooms/private") {
            int host_id = SimpleJson::get_int(body, "host_id", 1001);
            std::string host_name = SimpleJson::get_string(body, "host_name");
            int host_elo = SimpleJson::get_int(body, "host_elo", 1000);
            int mode = SimpleJson::get_int(body, "mode", 1);
            auto r = room_mgr.create_private_room(host_id, host_name, host_elo, mode);
            resp_body = "{\"success\":true,\"room_id\":\"" + r->id + "\",\"code\":\"" + r->code + "\"}";
        } else if (method == "POST" && path == "/api/rooms/join-code") {
            std::string code = SimpleJson::get_string(body, "code");
            int guest_id = SimpleJson::get_int(body, "guest_id", 1002);
            std::string guest_name = SimpleJson::get_string(body, "guest_name");
            int guest_elo = SimpleJson::get_int(body, "guest_elo", 1000);
            std::string matched_id;
            if (room_mgr.join_room_by_code(code, guest_id, guest_name, guest_elo, matched_id)) {
                resp_body = "{\"success\":true,\"room_id\":\"" + matched_id + "\"}";
            } else {
                status_code = "400 Bad Request";
                resp_body = "{\"success\":false,\"error\":\"Invalid room code or room is full\"}";
            }
        } else if (method == "POST" && path == "/api/rooms/ready") {
            std::string room_id = SimpleJson::get_string(body, "room_id");
            int user_id = SimpleJson::get_int(body, "user_id");
            bool is_ready = SimpleJson::get_bool(body, "ready", true);
            room_mgr.set_player_ready(room_id, user_id, is_ready);
            resp_body = "{\"success\":true}";
        } else if (method == "POST" && path == "/api/rooms/start") {
            std::string room_id = SimpleJson::get_string(body, "room_id");
            int host_id = SimpleJson::get_int(body, "host_id");
            if (room_mgr.start_match(room_id, host_id)) {
                resp_body = "{\"success\":true,\"message\":\"Match started!\"}";
            } else {
                status_code = "400 Bad Request";
                resp_body = "{\"success\":false,\"error\":\"Cannot start: opponent must join and ready up\"}";
            }
        } else if (method == "POST" && path == "/api/rooms/practice-ai") {
            int uid = SimpleJson::get_int(body, "user_id", 1001);
            std::string uname = SimpleJson::get_string(body, "username");
            int elo = SimpleJson::get_int(body, "elo", 1000);
            auto r = room_mgr.start_ai_practice(uid, uname, elo);
            resp_body = "{\"success\":true,\"room_id\":\"" + r->id + "\"}";
        }
        // --- GAME ACTIONS & STATE ---
        else if (method == "POST" && path == "/api/game/action") {
            // Check Emergency Freeze Lock
            if (cfg.game_lock_state == 1) {
                status_code = "423 Locked";
                resp_body = "{\"success\":false,\"error\":\"Lawn is frozen in maintenance mode by Administrator.\"}";
            } else {
                int client_id = SimpleJson::get_int(body, "client_id", 1001);
                // Check Rate Limiting (X actions per Y seconds)
                if (!check_rate_limit(client_id, cfg.action_rate_limit_x, cfg.action_rate_limit_y_sec)) {
                    status_code = "429 Too Many Requests";
                    resp_body = "{\"success\":false,\"error\":\"Rate limit exceeded. Too many tactical actions!\"}";
                } else {
                    std::string room_id = SimpleJson::get_string(body, "room_id");
                    std::string act = SimpleJson::get_string(body, "action");
                    int u_type = SimpleJson::get_int(body, "unit_type", 1);
                    int row = SimpleJson::get_int(body, "row", 0);
                    int col = SimpleJson::get_int(body, "col", 0);
                    int cost = SimpleJson::get_int(body, "cost", 50);

                    Game::NetworkAction na{
                        static_cast<uint64_t>(client_id), room_id, act, u_type, row, col, cost, Security::current_time_ms()
                    };
                    if (room_mgr.submit_action(na)) {
                        resp_body = "{\"success\":true}";
                    } else {
                        status_code = "429 Too Many Requests";
                        resp_body = "{\"success\":false,\"error\":\"Action queue full\"}";
                    }
                }
            }
        } else if (method == "GET" && path.find("/api/game/state") != std::string::npos) {
            std::string room_id = "";
            size_t qpos = path.find("room_id=");
            if (qpos != std::string::npos) {
                room_id = path.substr(qpos + 8);
                size_t amppos = room_id.find("&");
                if (amppos != std::string::npos) room_id = room_id.substr(0, amppos);
            }
            auto r = room_mgr.get_room(room_id);
            if (r) {
                if (r->is_started) {
                    r->battle.update_tick();
                }
                auto& b = r->battle;
                resp_body = "{\"room\":{\"id\":\"" + r->id + "\",\"code\":\"" + r->code + "\",\"mode\":" + std::to_string(r->mode) +
                            ",\"started\":" + (r->is_started ? "true" : "false") +
                            ",\"p1\":{\"name\":\"" + r->player1_name + "\",\"elo\":" + std::to_string(r->player1_elo) + ",\"ready\":" + (r->player1_ready ? "true" : "false") + "}" +
                            ",\"p2\":{\"name\":\"" + r->player2_name + "\",\"elo\":" + std::to_string(r->player2_elo) + ",\"ready\":" + (r->player2_ready ? "true" : "false") + "}}" +
                            ",\"tick\":" + std::to_string(b.tick_count) +
                            ",\"sun\":" + std::to_string(b.sun_energy) +
                            ",\"brains\":" + std::to_string(b.brain_points) +
                            ",\"is_game_over\":" + (b.is_game_over ? "true" : "false") +
                            ",\"winner\":" + std::to_string(b.winner_role) +
                            ",\"end_reason\":\"" + b.end_reason + "\"" +
                            ",\"invaders\":[";
                for (size_t i = 0; i < b.invaders.size(); ++i) {
                    if (i > 0) resp_body += ",";
                    resp_body += "{\"id\":" + std::to_string(b.invaders[i].id) +
                                 ",\"type\":" + std::to_string(b.invaders[i].type) +
                                 ",\"lane\":" + std::to_string(b.invaders[i].lane) +
                                 ",\"x\":" + std::to_string(static_cast<int>(b.invaders[i].x)) +
                                 ",\"hp\":" + std::to_string(b.invaders[i].hp) +
                                 ",\"max_hp\":" + std::to_string(b.invaders[i].max_hp) +
                                 ",\"chilled\":" + (b.invaders[i].is_chilled ? "true" : "false") +
                                 ",\"eating\":" + (b.invaders[i].is_eating ? "true" : "false") + "}";
                }
                resp_body += "],\"projectiles\":[";
                for (size_t i = 0; i < b.projectiles.size(); ++i) {
                    if (i > 0) resp_body += ",";
                    resp_body += "{\"lane\":" + std::to_string(b.projectiles[i].lane) +
                                 ",\"x\":" + std::to_string(static_cast<int>(b.projectiles[i].x)) +
                                 ",\"ice\":" + (b.projectiles[i].is_ice ? "true" : "false") + "}";
                }
                resp_body += "]}";
            } else {
                status_code = "404 Not Found";
                resp_body = "{\"error\":\"Room not found\"}";
            }
        } 
        // --- LEADERBOARD & STATS ---
        else if (method == "GET" && path == "/api/leaderboard") {
            auto profiles = store.load_all_profiles();
            resp_body = "[";
            for (size_t i = 0; i < profiles.size(); ++i) {
                if (i > 0) resp_body += ",";
                resp_body += "{\"user_id\":" + std::to_string(profiles[i].user_id) +
                             ",\"display_name\":\"" + std::string(profiles[i].display_name) +
                             "\",\"elo\":" + std::to_string(profiles[i].elo) +
                             ",\"wins\":" + std::to_string(profiles[i].wins) +
                             ",\"losses\":" + std::to_string(profiles[i].losses) +
                             ",\"matches\":" + std::to_string(profiles[i].total_matches) + "}";
            }
            resp_body += "]";
        } 
        // --- ADMIN LIVE CONFIGURATION ---
        else if (method == "GET" && path == "/admin/config") {
            resp_body = "{\"zombie_speed\":" + std::to_string(cfg.zombie_speed_multiplier) +
                        ",\"sun_spawn_interval\":" + std::to_string(cfg.sun_spawn_interval_sec) +
                        ",\"max_plants_per_row\":" + std::to_string(cfg.max_plants_per_row) +
                        ",\"rate_limit_x\":" + std::to_string(cfg.action_rate_limit_x) +
                        ",\"rate_limit_y\":" + std::to_string(cfg.action_rate_limit_y_sec) +
                        ",\"lock_state\":" + std::to_string(cfg.game_lock_state) +
                        ",\"start_sun\":" + std::to_string(cfg.start_sun_amount) +
                        ",\"zombie_health\":" + std::to_string(cfg.zombie_health_multiplier) + "}";
        } else if (method == "PUT" && path == "/admin/config") {
            cfg.game_lock_state = SimpleJson::get_int(body, "lock_state", cfg.game_lock_state);
            cfg.start_sun_amount = SimpleJson::get_int(body, "start_sun", cfg.start_sun_amount);
            cfg.action_rate_limit_x = SimpleJson::get_int(body, "rate_limit_x", cfg.action_rate_limit_x);
            cfg.action_rate_limit_y_sec = SimpleJson::get_int(body, "rate_limit_y", cfg.action_rate_limit_y_sec);
            store.save_config(cfg);
            resp_body = "{\"success\":true,\"message\":\"Config flushed to config.bin and active.\"}";
        } 
        // --- IDEMPOTENT DEMO DATA SEEDING ---
        else if (method == "POST" && path == "/api/admin/seed-demo") {
            struct DemoUserSeed {
                std::string name;
                uint32_t elo;
                uint32_t wins;
                uint32_t losses;
            };
            std::vector<DemoUserSeed> demo_users = {
                {"SolarEmpress", 1450, 48, 12},
                {"ZombossTactician", 1380, 41, 19},
                {"KernelPultPro", 1250, 29, 21},
                {"WallNutTitan", 1120, 18, 16},
                {"NightShroomer", 950, 9, 23}
            };
            auto existing = store.load_all_accounts();
            int created_count = 0;
            for (const auto& du : demo_users) {
                bool exists = false;
                for (const auto& a : existing) {
                    if (std::string(a.username) == du.name) { exists = true; break; }
                }
                if (!exists) {
                    AccountRecord d_acc;
                    ProfileRecord d_prof;
                    std::string err;
                    if (auth.register_user(du.name, "DemoPassword123!", d_acc, d_prof, err)) {
                        d_prof.elo = du.elo;
                        d_prof.wins = du.wins;
                        d_prof.losses = du.losses;
                        d_prof.total_matches = du.wins + du.losses;
                        store.update_profile_by_user_id(d_acc.user_id, d_prof);
                        created_count++;
                    }
                }
            }
            resp_body = "{\"success\":true,\"seeded_count\":" + std::to_string(created_count) + "}";
        }
        // --- 30-CLIENT SIMULATED LOAD TEST ---
        else if (method == "POST" && path == "/api/admin/load-test") {
            int success_actions = 0;
            for (int i = 0; i < 30; ++i) {
                Game::NetworkAction na{
                    static_cast<uint64_t>(2000 + i), "test_load_room", "PLACE_PLANT", 1, (i % 5), (i % 9), 100, Security::current_time_ms()
                };
                if (room_mgr.submit_action(na)) success_actions++;
            }
            resp_body = "{\"success\":true,\"enqueued_actions\":" + std::to_string(success_actions) + ",\"capacity\":2048}";
        } else {
            status_code = "404 Not Found";
            resp_body = "{\"error\":\"Route not found\"}";
        }

        std::string http_response = 
            "HTTP/1.1 " + status_code + "\r\n"
            "Content-Type: application/json\r\n"
            "Access-Control-Allow-Origin: *\r\n"
            "Access-Control-Allow-Methods: GET, POST, PUT, PATCH, OPTIONS\r\n"
            "Access-Control-Allow-Headers: Content-Type, Authorization\r\n"
            "Content-Length: " + std::to_string(resp_body.length()) + "\r\n\r\n" + resp_body;

        send(client_socket, http_response.c_str(), static_cast<int>(http_response.length()), 0);
        closesocket(client_socket);
    }

public:
    HttpServer(int p, Security::AuthManager& a, Storage::BinaryStore& s, Game::RoomManager& rm)
        : port(p), running(false), server_fd(INVALID_SOCKET), auth(a), store(s), room_mgr(rm) {}

    ~HttpServer() { stop(); }

    bool start() {
#ifdef _WIN32
        WSADATA wsa;
        if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
            std::cerr << "WSAStartup failed\n";
            return false;
        }
#endif
        server_fd = socket(AF_INET, SOCK_STREAM, 0);
        if (server_fd == INVALID_SOCKET) {
            std::cerr << "Failed to create socket\n";
            return false;
        }

        int opt = 1;
        setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, reinterpret_cast<const char*>(&opt), sizeof(opt));

        sockaddr_in address{};
        address.sin_family = AF_INET;
        address.sin_addr.s_addr = INADDR_ANY;
        address.sin_port = htons(port);

        if (bind(server_fd, reinterpret_cast<struct sockaddr*>(&address), sizeof(address)) == SOCKET_ERROR) {
            std::cerr << "Bind failed on port " << port << "\n";
            closesocket(server_fd);
            return false;
        }

        if (listen(server_fd, 64) == SOCKET_ERROR) {
            std::cerr << "Listen failed\n";
            closesocket(server_fd);
            return false;
        }

        running = true;
        std::cout << "[SERVER] C++17 Authoritative Game Server running on port " << port << "...\n";

        while (running) {
            sockaddr_in client_addr{};
            socklen_t client_len = sizeof(client_addr);
            SOCKET client_sock = accept(server_fd, reinterpret_cast<struct sockaddr*>(&client_addr), &client_len);
            if (client_sock == INVALID_SOCKET) {
                if (!running) break;
                continue;
            }

            std::thread([this, client_sock]() {
                handle_client(client_sock);
            }).detach();
        }

        return true;
    }

    void stop() {
        running = false;
        if (server_fd != INVALID_SOCKET) {
            closesocket(server_fd);
            server_fd = INVALID_SOCKET;
        }
#ifdef _WIN32
        WSACleanup();
#endif
    }
};

} // namespace Network
