#pragma once

#include "../game/RoomManager.hpp"
#include "../auth/AuthManager.hpp"
#include "../storage/BinaryStorage.hpp"
#include <string>
#include <vector>
#include <unordered_map>
#include <thread>
#include <mutex>
#include <atomic>
#include <memory>
#include <sstream>
#include <cstdint>
#include <cstring>
#include <iostream>
#include <fstream>

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

namespace Network {

// Simple JSON helper for WebSocket messages
class JsonHelper {
public:
    static std::string extract_field(const std::string& json, const std::string& key) {
        std::string pattern = "\"" + key + "\":\"";
        size_t pos = json.find(pattern);
        if (pos != std::string::npos) {
            size_t start = pos + pattern.length();
            size_t end = json.find("\"", start);
            if (end != std::string::npos) return json.substr(start, end - start);
        }
        return "";
    }

    static int extract_int(const std::string& json, const std::string& key, int default_val = 0) {
        std::string pattern = "\"" + key + "\":";
        size_t pos = json.find(pattern);
        if (pos != std::string::npos) {
            size_t start = pos + pattern.length();
            while (start < json.length() && (json[start] == ' ' || json[start] == '\t')) start++;
            size_t end = start;
            while (end < json.length() && (std::isdigit(json[end]) || json[end] == '-')) end++;
            if (start != end) {
                try { return std::stoi(json.substr(start, end - start)); } catch (...) {}
            }
        }
        return default_val;
    }

    static bool extract_bool(const std::string& json, const std::string& key, bool def = false) {
        size_t pos = json.find("\"" + key + "\":");
        if (pos != std::string::npos) {
            size_t tpos = json.find("true", pos);
            size_t fpos = json.find("false", pos);
            if (tpos != std::string::npos && (fpos == std::string::npos || tpos < fpos)) return true;
        }
        return def;
    }
};

// WebSocket message frame helper
class WsFrame {
public:
    static std::string create_frame(const std::string& payload, bool is_binary = false) {
        std::string frame;
        uint8_t opcode = is_binary ? 0x02 : 0x01; // 0x02=binary, 0x01=text
        frame.push_back(0x81 | opcode); // FIN + text/binary

        size_t len = payload.length();
        if (len <= 125) {
            frame.push_back(static_cast<char>(len));
        } else if (len <= 65535) {
            frame.push_back(126);
            frame.push_back(static_cast<char>((len >> 8) & 0xFF));
            frame.push_back(static_cast<char>(len & 0xFF));
        } else {
            frame.push_back(127);
            for (int i = 7; i >= 0; i--) {
                frame.push_back(static_cast<char>((len >> (i * 8)) & 0xFF));
            }
        }
        frame += payload;
        return frame;
    }
};

class WebSocketClient {
public:
    SOCKET socket;
    std::string session_token;
    uint64_t user_id;
    std::string room_id;
    std::string role;
    bool connected;
    std::thread reader_thread;
    Game::RoomManager* room_mgr;
    Security::AuthManager* auth_mgr;
    Storage::BinaryStore* store;

    WebSocketClient(SOCKET sock, Game::RoomManager* rm, Security::AuthManager* am, Storage::BinaryStore* s)
        : socket(sock), room_mgr(rm), auth_mgr(am), store(s), connected(true),
          user_id(0), role(""), room_id("") {}

    void start_reader() {
        if (reader_thread.joinable()) return;
        reader_thread = std::thread(&WebSocketClient::reader_loop, this);
    }

    void stop() {
        connected = false;
        if (socket != INVALID_SOCKET) {
            closesocket(socket);
        }
        if (reader_thread.joinable()) {
            reader_thread.join();
        }
    }

    void send_text(const std::string& msg) {
        if (!connected) return;
        std::string frame = WsFrame::create_frame(msg);
        send(socket, frame.c_str(), static_cast<int>(frame.length()), 0);
    }

    void send_error(const std::string& msg) {
        send_text("{\"type\":\"ERROR\",\"msg\":\"" + escape_json(msg) + "\"}");
    }

    std::string escape_json(const std::string& s) {
        std::string result;
        for (char c : s) {
            switch (c) {
                case '"': result += "\\\""; break;
                case '\\': result += "\\\\"; break;
                default: result += c;
            }
        }
        return result;
    }

    void handle_message(const std::string& msg) {
        std::string type = JsonHelper::extract_field(msg, "type");

        if (type == "JOIN_MATCH") {
            std::string token = JsonHelper::extract_field(msg, "token");
            std::string room = JsonHelper::extract_field(msg, "room_id");
            std::string role = JsonHelper::extract_field(msg, "role");

            uint64_t uid = validate_token(token);
            if (uid == 0) {
                send_error("Invalid or expired session");
                return;
            }

            user_id = uid;
            room_id = room;
            role = role;
            send_text("{\"type\":\"JOINED\",\"role\":\"" + role + "\"}");
            broadcast_state();

        } else if (type == "PLACE_PLANT") {
            int plant_type = JsonHelper::extract_int(msg, "plant_type");
            int row = JsonHelper::extract_int(msg, "row");
            int col = JsonHelper::extract_int(msg, "col");
            int cost = JsonHelper::extract_int(msg, "cost");

            if (!can_perform_action()) {
                send_error("Not in match or invalid state");
                return;
            }

            Game::NetworkAction action{user_id, room_id, "PLACE_PLANT", plant_type, row, col, cost,
                Security::current_time_ms()};
            room_mgr->submit_action(action);

        } else if (type == "SPAWN_ZOMBIE") {
            int zombie_type = JsonHelper::extract_int(msg, "zombie_type");
            int lane = JsonHelper::extract_int(msg, "lane");

            if (!can_perform_action() || role != "ZOMBIE") {
                send_error("Only Zombie can spawn");
                return;
            }

            int cost = (zombie_type == 1) ? 50 : (zombie_type == 2) ? 75 : 125;
            Game::NetworkAction action{user_id, room_id, "SPAWN_INVADER", zombie_type, lane, 8, cost,
                Security::current_time_ms()};
            room_mgr->submit_action(action);

        } else if (type == "COLLECT_SUN") {
            int sun_id = JsonHelper::extract_int(msg, "sun_id");
            Game::NetworkAction action{user_id, room_id, "SUN_COLLECT", 0, 0, sun_id, 25,
                Security::current_time_ms()};
            room_mgr->submit_action(action);

        } else if (type == "UNDO_LAST_ACTION") {
            if (!can_perform_action() || role != "PLANT") {
                send_error("Only Plant can undo");
                return;
            }
            Game::NetworkAction action{user_id, room_id, "UNDO", 0, 0, 0, 0, Security::current_time_ms()};
            room_mgr->submit_action(action);
        }
    }

private:
    uint64_t validate_token(const std::string& token) {
        SessionRecord session{};
        std::ifstream file(store->get_data_dir() + "/sessions.bin", std::ios::binary);
        if (!file.is_open()) return 0;

        FileHeader hdr;
        file.read(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        if (hdr.magic != MAGIC_SESSIONS) return 0;

        for (uint32_t i = 0; i < hdr.record_count; i++) {
            SessionRecord s{};
            uint64_t offset = sizeof(FileHeader) + static_cast<uint64_t>(i) * sizeof(SessionRecord);
            file.seekg(offset, std::ios::beg);
            file.read(reinterpret_cast<char*>(&s), sizeof(SessionRecord));
            if (std::string(s.token) == token && !s.is_revoked) {
                uint64_t now = Security::current_time_ms();
                if (s.expires_at > now) {
                    return s.user_id;
                }
            }
        }
        return 0;
    }

    bool can_perform_action() {
        auto room = room_mgr->get_room(room_id);
        return room && room->is_started && user_id != 0;
    }

    void broadcast_state() {
        auto room = room_mgr->get_room(room_id);
        if (!room) return;

        auto& b = room->battle;
        std::string update = "{\"type\":\"TICK_UPDATE\",\"tick\":" + std::to_string(b.tick_count) +
            ",\"sun\":" + std::to_string(b.sun_energy) +
            ",\"brains\":" + std::to_string(b.brain_points) +
            ",\"is_game_over\":" + (b.is_game_over ? "true" : "false") +
            ",\"winner\":" + std::to_string(b.winner_role) +
            ",\"end_reason\":\"" + b.end_reason + "\"" +
            ",\"invaders\":[";

        for (size_t i = 0; i < b.invaders.size(); ++i) {
            if (i > 0) update += ",";
            update += "{\"id\":" + std::to_string(b.invaders[i].id) +
                ",\"type\":" + std::to_string(b.invaders[i].type) +
                ",\"lane\":" + std::to_string(b.invaders[i].lane) +
                ",\"x\":" + std::to_string(static_cast<int>(b.invaders[i].x)) +
                ",\"hp\":" + std::to_string(b.invaders[i].hp) +
                ",\"chilled\":" + (b.invaders[i].is_chilled ? "true" : "false") + "}";
        }
        update += "],\"projectiles\":[";
        for (size_t i = 0; i < b.projectiles.size(); ++i) {
            if (i > 0) update += ",";
            update += "{\"lane\":" + std::to_string(b.projectiles[i].lane) +
                ",\"x\":" + std::to_string(static_cast<int>(b.projectiles[i].x)) +
                ",\"ice\":" + (b.projectiles[i].is_ice ? "true" : "false") + "}";
        }
        update += "]}";

        send_text(update);
    }

    void reader_loop() {
        while (connected) {
            char header[2] = {0};
            int bytes = recv(socket, header, 2, 0);
            if (bytes <= 0) {
                connected = false;
                break;
            }

            uint8_t mask_len = header[1] & 0x7F;
            std::string payload;

            if (mask_len <= 125) {
                payload.resize(mask_len);
            } else if (mask_len == 126) {
                char ext[2];
                if (recv(socket, ext, 2, 0) <= 0) { connected = false; break; }
                uint16_t len = (ext[0] << 8) | ext[1];
                payload.resize(len);
            } else {
                connected = false;
                break;
            }

            if (recv(socket, &payload[0], payload.size(), 0) <= 0) {
                connected = false;
                break;
            }

            handle_message(payload);
        }
    }
};

class WebSocketServer {
private:
    int port;
    std::atomic<bool> running;
    SOCKET server_fd;
    std::vector<std::shared_ptr<WebSocketClient>> clients;
    std::mutex clients_mutex;
    std::thread accept_thread;
    Game::RoomManager* room_mgr;
    Security::AuthManager* auth_mgr;
    Storage::BinaryStore* store;

public:
    WebSocketServer(int p, Security::AuthManager& a, Storage::BinaryStore& s, Game::RoomManager& rm)
        : port(p), running(false), server_fd(INVALID_SOCKET),
          room_mgr(&rm), auth_mgr(&a), store(&s) {}

    ~WebSocketServer() { stop(); }

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
            std::cerr << "Failed to create WebSocket socket\n";
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
        std::cout << "[WS] WebSocket Server running on ws://0.0.0.0:" << port << "\n";

        // Send WebSocket handshake response to new connections
        while (running) {
            sockaddr_in client_addr{};
            socklen_t client_len = sizeof(client_addr);
            SOCKET client_sock = accept(server_fd, reinterpret_cast<struct sockaddr*>(&client_addr), &client_len);
            if (client_sock == INVALID_SOCKET) {
                if (!running) break;
                continue;
            }

            // Read HTTP handshake
            char handshake[4096] = {0};
            if (recv(client_sock, handshake, sizeof(handshake) - 1, 0) <= 0) {
                closesocket(client_sock);
                continue;
            }

            // Send 101 Switching Protocols
            std::string handshake_resp =
                "HTTP/1.1 101 Switching Protocols\r\n"
                "Upgrade: websocket\r\n"
                "Connection: Upgrade\r\n"
                "Sec-WebSocket-Accept: dG9rZW4=\r\n\r\n";
            send(client_sock, handshake_resp.c_str(), static_cast<int>(handshake_resp.length()), 0);

            auto client = std::make_shared<WebSocketClient>(client_sock, *room_mgr, *auth_mgr, *store);
            {
                std::lock_guard<std::mutex> lock(clients_mutex);
                clients.push_back(client);
            }
            client->start_reader();
        }

        return true;
    }

    void stop() {
        running = false;
        if (server_fd != INVALID_SOCKET) {
            closesocket(server_fd);
            server_fd = INVALID_SOCKET;
        }

        std::lock_guard<std::mutex> lock(clients_mutex);
        for (auto& client : clients) {
            client->stop();
        }
        clients.clear();
    }
};

} // namespace Network