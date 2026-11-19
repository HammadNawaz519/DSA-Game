#pragma once

#include "GameEngine.hpp"
#include "../dsa/CoreStructures.hpp"
#include "../dsa/TreesAndHash.hpp"
#include "../storage/BinaryContracts.hpp"
#include <string>
#include <unordered_map>
#include <mutex>
#include <memory>
#include <thread>
#include <atomic>
#include <vector>
#include <random>
#include <algorithm>

namespace Game {

struct NetworkAction {
    uint64_t client_id;
    std::string room_id;
    std::string action_type; // "PLACE_PLANT", "SPAWN_INVADER", "UNDO", "READY", "SURRENDER"
    int unit_type;
    int row;
    int col;
    int cost;
    uint64_t timestamp;
};

struct MatchmakingTicket {
    uint64_t user_id;
    std::string username;
    uint32_t elo;
    int mode; // 1 = 1v1 PvP, 2 = Co-op
    uint64_t join_time;
    std::string matched_room_id;
    std::string matched_role; // "PLANT" or "ZOMBIE"
    bool is_matched;
};

struct GameRoom {
    std::string id;
    std::string code; // 6-char unique code (e.g. "FLOR42")
    std::string name;
    
    uint64_t player1_id;
    std::string player1_name;
    uint32_t player1_elo;
    bool player1_ready;

    uint64_t player2_id;
    std::string player2_name;
    uint32_t player2_elo;
    bool player2_ready;

    int mode; // 1 = 1v1 PvP, 2 = Co-op, 3 = Practice AI
    bool is_active;
    bool is_started;
    bool is_ai_practice;
    uint64_t created_at;
    LawnBattleState battle;

    GameRoom(const std::string& r_id = "", const std::string& r_code = "", const std::string& r_name = "") 
        : id(r_id), code(r_code), name(r_name),
          player1_id(0), player1_elo(1000), player1_ready(false),
          player2_id(0), player2_elo(1000), player2_ready(false),
          mode(1), is_active(false), is_started(false), is_ai_practice(false),
          created_at(0) {}
};

class RoomManager {
private:
    std::mutex room_mutex;
    std::unordered_map<std::string, std::shared_ptr<GameRoom>> rooms_by_id;
    std::unordered_map<std::string, std::string> code_to_id;
    RoomBST<std::string> room_search_tree; // Student BST for fast room lookup
    CircularQueue<NetworkAction, 2048> action_queue; // Student Circular Queue
    
    std::vector<MatchmakingTicket> mm_queue;
    std::atomic<bool> worker_running;
    std::thread worker_thread;
    std::thread matchmaker_thread;
    std::thread ai_director_thread;

    std::string generate_room_code() {
        static const char charset[] = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        std::string code = "";
        std::random_device rd;
        for (int i = 0; i < 6; ++i) {
            code += charset[rd() % (sizeof(charset) - 1)];
        }
        return code;
    }

    void worker_loop() {
        while (worker_running) {
            NetworkAction action;
            if (action_queue.dequeue(action)) {
                std::lock_guard<std::mutex> lock(room_mutex);
                auto it = rooms_by_id.find(action.room_id);
                if (it != rooms_by_id.end() && it->second->is_started) {
                    auto& room = it->second;
                    if (action.action_type == "PLACE_PLANT") {
                        if (action.client_id == room->player1_id || room->mode == 2) {
                            room->battle.place_plant(static_cast<UnitType>(action.unit_type), action.row, action.col, action.cost);
                        }
                    } else if (action.action_type == "SPAWN_INVADER") {
                        if (action.client_id == room->player2_id) {
                            room->battle.spawn_invader(static_cast<InvaderType>(action.unit_type), action.row, action.cost);
                        }
                    } else if (action.action_type == "UNDO") {
                        if (action.client_id == room->player1_id || room->mode == 2) {
                            room->battle.undo_last_plant();
                        }
                    } else if (action.action_type == "SURRENDER") {
                        room->battle.is_game_over = true;
                        room->battle.winner_role = (action.client_id == room->player1_id) ? 2 : 1;
                        room->battle.end_reason = "Opponent conceded match.";
                    }
                }
            } else {
                std::this_thread::sleep_for(std::chrono::milliseconds(2));
            }
        }
    }

    void matchmaker_loop() {
        while (worker_running) {
            std::this_thread::sleep_for(std::chrono::milliseconds(500));
            std::lock_guard<std::mutex> lock(room_mutex);

            if (mm_queue.size() < 2) continue;

            uint64_t now = static_cast<uint64_t>(std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::system_clock::now().time_since_epoch()).count());

            for (size_t i = 0; i < mm_queue.size(); ++i) {
                if (mm_queue[i].is_matched) continue;

                for (size_t j = i + 1; j < mm_queue.size(); ++j) {
                    if (mm_queue[j].is_matched) continue;
                    if (mm_queue[i].mode != mm_queue[j].mode) continue;

                    uint64_t wait_sec = (now - mm_queue[i].join_time) / 1000;
                    uint32_t allowed_elo_diff = 100 + static_cast<uint32_t>(wait_sec * 25);
                    uint32_t actual_diff = (mm_queue[i].elo > mm_queue[j].elo) 
                        ? (mm_queue[i].elo - mm_queue[j].elo) 
                        : (mm_queue[j].elo - mm_queue[i].elo);

                    if (actual_diff <= allowed_elo_diff) {
                        // Match found!
                        std::string r_id = "match_" + std::to_string(now % 100000);
                        std::string r_code = generate_room_code();
                        auto room = std::make_shared<GameRoom>(r_id, r_code, "Ranked Match #" + r_code);

                        room->player1_id = mm_queue[i].user_id;
                        room->player1_name = mm_queue[i].username;
                        room->player1_elo = mm_queue[i].elo;
                        room->player1_ready = true;

                        room->player2_id = mm_queue[j].user_id;
                        room->player2_name = mm_queue[j].username;
                        room->player2_elo = mm_queue[j].elo;
                        room->player2_ready = true;

                        room->mode = mm_queue[i].mode;
                        room->is_active = true;
                        room->is_started = true;
                        room->created_at = now;

                        rooms_by_id[r_id] = room;
                        code_to_id[r_code] = r_id;

                        mm_queue[i].is_matched = true;
                        mm_queue[i].matched_room_id = r_id;
                        mm_queue[i].matched_role = "PLANT";

                        mm_queue[j].is_matched = true;
                        mm_queue[j].matched_room_id = r_id;
                        mm_queue[j].matched_role = "ZOMBIE";

                        break;
                    }
                }
            }

            // Cleanup matched tickets older than 10 seconds
            mm_queue.erase(std::remove_if(mm_queue.begin(), mm_queue.end(), [now](const MatchmakingTicket& t) {
                return t.is_matched && (now - t.join_time > 15000);
            }), mm_queue.end());
        }
    }

    void ai_director_loop() {
        while (worker_running) {
            std::this_thread::sleep_for(std::chrono::milliseconds(2000));
            std::lock_guard<std::mutex> lock(room_mutex);

            for (auto& pair : rooms_by_id) {
                auto& room = pair.second;
                if (room->is_started && (room->is_ai_practice || room->mode == 2)) {
                    // AI wave spawner
                    if (!room->battle.is_game_over) {
                        int lane = std::rand() % 5;
                        InvaderType inv = INV_REGULAR;
                        int cost = 50;
                        if (room->battle.tick_count > 600 && (std::rand() % 3 == 0)) {
                            inv = INV_CONEHEAD; cost = 75;
                        } else if (room->battle.tick_count > 1200 && (std::rand() % 4 == 0)) {
                            inv = INV_BUCKETHEAD; cost = 125;
                        }
                        room->battle.spawn_invader(inv, lane, cost);
                    }
                }
            }
        }
    }

public:
    RoomManager() : worker_running(true) {
        worker_thread = std::thread(&RoomManager::worker_loop, this);
        matchmaker_thread = std::thread(&RoomManager::matchmaker_loop, this);
        ai_director_thread = std::thread(&RoomManager::ai_director_loop, this);
    }

    ~RoomManager() {
        worker_running = false;
        if (worker_thread.joinable()) worker_thread.join();
        if (matchmaker_thread.joinable()) matchmaker_thread.join();
        if (ai_director_thread.joinable()) ai_director_thread.join();
    }

    // --- MATCHMAKING METHODS ---

    bool queue_player(uint64_t user_id, const std::string& username, uint32_t elo, int mode) {
        std::lock_guard<std::mutex> lock(room_mutex);
        // Prevent duplicate queue entries
        for (auto& t : mm_queue) {
            if (t.user_id == user_id && !t.is_matched) return true;
        }
        uint64_t now = static_cast<uint64_t>(std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count());
        mm_queue.push_back({user_id, username, elo, mode, now, "", "", false});
        return true;
    }

    bool cancel_queue(uint64_t user_id) {
        std::lock_guard<std::mutex> lock(room_mutex);
        mm_queue.erase(std::remove_if(mm_queue.begin(), mm_queue.end(), [user_id](const MatchmakingTicket& t) {
            return t.user_id == user_id && !t.is_matched;
        }), mm_queue.end());
        return true;
    }

    bool poll_match(uint64_t user_id, std::string& out_room_id, std::string& out_role, uint64_t& out_elapsed_sec) {
        std::lock_guard<std::mutex> lock(room_mutex);
        uint64_t now = static_cast<uint64_t>(std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count());

        for (const auto& t : mm_queue) {
            if (t.user_id == user_id) {
                out_elapsed_sec = (now - t.join_time) / 1000;
                if (t.is_matched) {
                    out_room_id = t.matched_room_id;
                    out_role = t.matched_role;
                    return true;
                }
                return false;
            }
        }
        return false;
    }

    // --- PRIVATE ROOM METHODS ---

    std::shared_ptr<GameRoom> create_private_room(uint64_t host_id, const std::string& host_name, uint32_t host_elo, int mode) {
        std::lock_guard<std::mutex> lock(room_mutex);
        uint64_t now = static_cast<uint64_t>(std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count());

        std::string r_code = generate_room_code();
        std::string r_id = "room_" + r_code;
        auto room = std::make_shared<GameRoom>(r_id, r_code, host_name + "'s Garden");

        room->player1_id = host_id;
        room->player1_name = host_name;
        room->player1_elo = host_elo;
        room->player1_ready = true;
        room->mode = mode;
        room->created_at = now;

        rooms_by_id[r_id] = room;
        code_to_id[r_code] = r_id;
        room_search_tree.insert(r_code, r_id);

        return room;
    }

    std::shared_ptr<GameRoom> start_ai_practice(uint64_t player_id, const std::string& player_name, uint32_t elo) {
        std::lock_guard<std::mutex> lock(room_mutex);
        uint64_t now = static_cast<uint64_t>(std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count());

        std::string r_code = "BOT_" + std::to_string(now % 10000);
        std::string r_id = "practice_" + r_code;
        auto room = std::make_shared<GameRoom>(r_id, r_code, "AI Training Lawn");

        room->player1_id = player_id;
        room->player1_name = player_name;
        room->player1_elo = elo;
        room->player1_ready = true;

        room->player2_id = 999999;
        room->player2_name = "Garden Training Bot";
        room->player2_elo = 1000;
        room->player2_ready = true;

        room->mode = 3; // Practice AI
        room->is_ai_practice = true;
        room->is_active = true;
        room->is_started = true;
        room->created_at = now;

        rooms_by_id[r_id] = room;
        code_to_id[r_code] = r_id;

        return room;
    }

    bool join_room_by_code(const std::string& code, uint64_t guest_id, const std::string& guest_name, uint32_t guest_elo, std::string& out_room_id) {
        std::lock_guard<std::mutex> lock(room_mutex);
        std::string upper_code = code;
        std::transform(upper_code.begin(), upper_code.end(), upper_code.begin(), ::toupper);

        auto it = code_to_id.find(upper_code);
        if (it == code_to_id.end()) return false;

        out_room_id = it->second;
        auto room = rooms_by_id[out_room_id];
        if (room->player2_id != 0 && room->player2_id != guest_id) return false; // Room full

        room->player2_id = guest_id;
        room->player2_name = guest_name;
        room->player2_elo = guest_elo;
        room->player2_ready = false;
        return true;
    }

    bool set_player_ready(const std::string& room_id, uint64_t user_id, bool is_ready) {
        std::lock_guard<std::mutex> lock(room_mutex);
        auto it = rooms_by_id.find(room_id);
        if (it == rooms_by_id.end()) return false;
        auto& r = it->second;
        if (r->player1_id == user_id) r->player1_ready = is_ready;
        else if (r->player2_id == user_id) r->player2_ready = is_ready;
        return true;
    }

    bool start_match(const std::string& room_id, uint64_t host_id) {
        std::lock_guard<std::mutex> lock(room_mutex);
        auto it = rooms_by_id.find(room_id);
        if (it == rooms_by_id.end()) return false;
        auto& r = it->second;
        if (r->player1_id != host_id) return false; // Host only
        if (r->player2_id == 0 || !r->player2_ready) return false; // Both must be ready

        r->is_active = true;
        r->is_started = true;
        return true;
    }

    std::shared_ptr<GameRoom> get_room(const std::string& id) {
        std::lock_guard<std::mutex> lock(room_mutex);
        auto it = rooms_by_id.find(id);
        return (it != rooms_by_id.end()) ? it->second : nullptr;
    }

    bool submit_action(const NetworkAction& action) {
        return action_queue.enqueue(action);
    }

    std::vector<std::shared_ptr<GameRoom>> get_all_rooms() {
        std::lock_guard<std::mutex> lock(room_mutex);
        std::vector<std::shared_ptr<GameRoom>> list;
        for (const auto& pair : rooms_by_id) list.push_back(pair.second);
        return list;
    }
};

} // namespace Game
