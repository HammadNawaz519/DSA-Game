#pragma once

#include "../dsa/CoreStructures.hpp"
#include "../dsa/SortingAndHeap.hpp"
#include "../dsa/TreesAndHash.hpp"
#include "../dsa/AdvancedDSA.hpp"
#include "../storage/BinaryContracts.hpp"
#include <vector>
#include <string>
#include <cmath>
#include <iostream>

namespace Game {

enum UnitType : uint8_t {
    UNIT_NONE = 0,
    UNIT_SPITTER = 1,      // 100 cost, attacks lane with peas
    UNIT_SUN_FLOWER = 2,    // 50 cost, generates sun every 10s
    UNIT_WALL_BARRIER = 3,  // 50 cost, 4000 HP defense wall
    UNIT_CHERRY_BOOM = 4,   // 150 cost, explodes 3x3 after 1.5s
    UNIT_FROST_SPITTER = 5, // 175 cost, slows invaders
    UNIT_JALAPENO = 6       // 125 cost, clears entire row
};

enum InvaderType : uint8_t {
    INV_NONE = 0,
    INV_REGULAR = 1,    // 200 HP, speed 1.0
    INV_CONEHEAD = 2,   // 560 HP, speed 1.0
    INV_BUCKETHEAD = 3, // 1300 HP, speed 1.0
    INV_FLAG = 4,       // 300 HP, speed 1.2
    INV_RUNNER = 5      // 340 HP, speed 1.8 (newspaper rage)
};

struct PlantEntity {
    uint32_t id;
    UnitType type;
    int row;
    int col;
    int hp;
    int max_hp;
    uint32_t last_attack_tick;
    uint32_t place_tick;
};

struct InvaderEntity {
    uint32_t id;
    InvaderType type;
    int lane;           // Row 0..4
    float x;            // Column coordinate (e.g. 850.0 down to 0.0)
    int hp;
    int max_hp;
    float speed;
    bool is_chilled;
    uint32_t chill_expiry_tick;
    bool is_eating;
    uint32_t last_eat_tick;
};

struct ProjectileEntity {
    uint32_t id;
    int lane;
    float x;
    bool is_ice;
    int damage;
};

class LawnBattleState {
public:
    uint64_t match_id;
    uint32_t tick_count;
    bool is_game_over;
    uint8_t winner_role; // 0=None, 1=Plants, 2=Invaders
    std::string end_reason;

    int sun_energy;
    int brain_points;
    bool lawn_mower_active[5];

    // Data structures
    Grid2D<PlantEntity*> grid;
    std::vector<InvaderEntity> invaders;
    std::vector<ProjectileEntity> projectiles;
    MyStack<PlantEntity> undo_stack; // For 3-second undo action

    uint32_t next_entity_id;

    LawnBattleState(uint64_t m_id = 1) 
        : match_id(m_id), tick_count(0), is_game_over(false), winner_role(0),
          sun_energy(150), brain_points(150), grid(5, 9, nullptr), next_entity_id(1) {
        for (int i = 0; i < 5; ++i) lawn_mower_active[i] = true;
    }

    ~LawnBattleState() {
        for (size_t r = 0; r < 5; ++r) {
            for (size_t c = 0; c < 9; ++c) {
                delete grid.at(r, c);
            }
        }
    }

    // --- ACTIONS ---

    bool place_plant(UnitType type, int r, int c, int cost) {
        if (r < 0 || r >= 5 || c < 0 || c >= 9) return false;
        if (grid.at(r, c) != nullptr) return false; // Cell already occupied
        if (sun_energy < cost) return false;

        sun_energy -= cost;
        int initial_hp = (type == UNIT_WALL_BARRIER) ? 4000 : 300;

        PlantEntity* p = new PlantEntity{
            next_entity_id++, type, r, c, initial_hp, initial_hp, tick_count, tick_count
        };
        grid.at(r, c) = p;
        undo_stack.push(*p);
        return true;
    }

    bool undo_last_plant() {
        PlantEntity last;
        if (undo_stack.pop(last)) {
            // Check if undo is within 60 ticks (3 seconds at 20 ticks/sec)
            if (tick_count - last.place_tick <= 60) {
                PlantEntity* cur = grid.at(last.row, last.col);
                if (cur && cur->id == last.id) {
                    delete cur;
                    grid.at(last.row, last.col) = nullptr;
                    sun_energy += (last.type == UNIT_WALL_BARRIER) ? 50 : 100; // Refund
                    return true;
                }
            }
        }
        return false;
    }

    bool spawn_invader(InvaderType type, int lane, int cost) {
        if (lane < 0 || lane >= 5) return false;
        if (brain_points < cost) return false;

        brain_points -= cost;
        int hp = 200;
        float spd = 0.7f;

        if (type == INV_CONEHEAD) { hp = 560; spd = 0.7f; }
        else if (type == INV_BUCKETHEAD) { hp = 1300; spd = 0.7f; }
        else if (type == INV_FLAG) { hp = 300; spd = 1.0f; }
        else if (type == INV_RUNNER) { hp = 340; spd = 1.3f; }

        invaders.push_back({
            next_entity_id++, type, lane, 850.0f, hp, hp, spd, false, 0, false, 0
        });
        return true;
    }

    // --- 20 HZ SIMULATION TICK ---

    void update_tick() {
        if (is_game_over) return;
        tick_count++;

        // 1. Passive resource generation
        if (tick_count % 100 == 0) { // Every 5 seconds
            sun_energy += 25;
            brain_points += 25;
        }

        // 2. Plants action (Attacking, Sun production, Explosions)
        for (int r = 0; r < 5; ++r) {
            // Check if invaders exist in this lane to the right
            bool has_target_in_lane = false;
            for (const auto& inv : invaders) {
                if (inv.lane == r && inv.x > 50.0f && inv.hp > 0) {
                    has_target_in_lane = true;
                    break;
                }
            }

            for (int c = 0; c < 9; ++c) {
                PlantEntity* p = grid.at(r, c);
                if (!p) continue;

                if (p->type == UNIT_SUN_FLOWER) {
                    if (tick_count - p->last_attack_tick >= 160) { // Every 8s
                        sun_energy += 50;
                        p->last_attack_tick = tick_count;
                    }
                } else if (p->type == UNIT_SPITTER || p->type == UNIT_FROST_SPITTER) {
                    if (has_target_in_lane && tick_count - p->last_attack_tick >= 30) { // 1.5s
                        float shoot_x = 80.0f + c * 82.0f + 40.0f;
                        projectiles.push_back({
                            next_entity_id++, r, shoot_x, (p->type == UNIT_FROST_SPITTER), 20
                        });
                        p->last_attack_tick = tick_count;
                    }
                } else if (p->type == UNIT_CHERRY_BOOM) {
                    if (tick_count - p->place_tick >= 30) { // Explodes after 1.5s
                        // 3x3 AoE blast using BFS splash
                        auto affected = GridBFS::compute_splash(r, c, 1);
                        for (auto& pos : affected) {
                            for (auto& inv : invaders) {
                                int inv_col = static_cast<int>((inv.x - 40.0f) / 82.0f);
                                if (inv.lane == pos.r && std::abs(inv_col - pos.c) <= 1) {
                                    inv.hp -= 1800; // Instant obliteration
                                }
                            }
                        }
                        delete p;
                        grid.at(r, c) = nullptr;
                    }
                }
            }
        }

        // 3. Projectiles travel & collision
        for (auto it = projectiles.begin(); it != projectiles.end();) {
            it->x += 10.0f; // Pea travel speed
            bool hit = false;

            for (auto& inv : invaders) {
                if (inv.lane == it->lane && inv.hp > 0) {
                    if (std::abs(it->x - inv.x) < 25.0f) {
                        inv.hp -= it->damage;
                        if (it->is_ice) {
                            inv.is_chilled = true;
                            inv.chill_expiry_tick = tick_count + 100; // 5 seconds
                        }
                        hit = true;
                        break;
                    }
                }
            }

            if (hit || it->x > 900.0f) {
                it = projectiles.erase(it);
            } else {
                ++it;
            }
        }

        // 4. Invaders walk & bite plants
        for (auto it = invaders.begin(); it != invaders.end();) {
            if (it->hp <= 0) {
                it = invaders.erase(it);
                continue;
            }

            // Chill status update
            if (it->is_chilled && tick_count > it->chill_expiry_tick) {
                it->is_chilled = false;
            }

            float current_speed = it->is_chilled ? (it->speed * 0.5f) : it->speed;
            int current_col = static_cast<int>((it->x - 40.0f) / 82.0f);

            // Check if there is a plant in the current cell to eat
            PlantEntity* target_plant = nullptr;
            if (current_col >= 0 && current_col < 9) {
                target_plant = grid.at(it->lane, current_col);
            }

            if (target_plant && target_plant->hp > 0) {
                it->is_eating = true;
                if (tick_count - it->last_eat_tick >= 10) { // Bite every 0.5s
                    target_plant->hp -= 20;
                    it->last_eat_tick = tick_count;
                    if (target_plant->hp <= 0) {
                        delete target_plant;
                        grid.at(it->lane, current_col) = nullptr;
                        it->is_eating = false;
                    }
                }
            } else {
                it->is_eating = false;
                it->x -= current_speed; // Walk toward house
            }

            // Check Lawnmower trigger
            if (it->x < 40.0f) {
                if (lawn_mower_active[it->lane]) {
                    lawn_mower_active[it->lane] = false;
                    // Wipe out all invaders in this row
                    for (auto& other : invaders) {
                        if (other.lane == it->lane) other.hp = 0;
                    }
                } else if (it->x < 0.0f) {
                    // Invader reached the house!
                    is_game_over = true;
                    winner_role = 2; // Invaders Win!
                    end_reason = "House breached by invader!";
                    return;
                }
            }

            ++it;
        }

        // Win condition: Plants survive 120 seconds (2400 ticks) and no active invaders left
        if (tick_count > 2400 && invaders.empty()) {
            is_game_over = true;
            winner_role = 1; // Plants Win!
            end_reason = "All waves repelled successfully!";
        }
    }
};

} // namespace Game
