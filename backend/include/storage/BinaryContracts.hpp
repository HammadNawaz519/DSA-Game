#pragma once

#include <cstdint>
#include <cstring>

#pragma pack(push, 1)

// Common 16-byte File Header for all fixed-record binary files
struct FileHeader {
    uint32_t magic;         // 4 ASCII chars (e.g. 'PVZA')
    uint32_t version;       // File format version (e.g. 1)
    uint32_t record_count;  // Total valid records stored
    uint32_t record_size;   // Size of each record in bytes
};

// accounts.bin record: Exactly 128 bytes
// Magic: 'P', 'V', 'Z', 'A' (0x50565A41)
struct AccountRecord {
    uint64_t user_id;           // Unique monotonic ID (starts at 1001)
    char     username[32];      // Null-terminated UTF-8 username
    uint8_t  salt[32];          // 32-byte cryptographic random salt
    uint8_t  password_hash[32]; // PBKDF2-SHA256 verifier hash
    uint64_t created_at;        // Epoch timestamp (milliseconds)
    uint64_t last_login;        // Epoch timestamp (milliseconds)
    uint8_t  is_active;         // 1 = active, 0 = disabled
    uint8_t  is_admin;          // 1 = admin, 0 = regular player
    uint8_t  padding[6];        // Align to exactly 128 bytes
};

// profiles.bin record: Exactly 128 bytes
// Magic: 'P', 'V', 'Z', 'P' (0x50565A50)
struct ProfileRecord {
    uint64_t user_id;           // Foreign key -> accounts.bin user_id
    char     display_name[32];  // Player customizable screen name
    uint32_t avatar_id;         // Avatar icon ID (1..12)
    uint32_t elo;               // Official ELO rating (default 1000)
    uint32_t total_matches;     // Wins + Losses + Draws
    uint32_t wins;              // Total match victories
    uint32_t losses;            // Total match defeats
    uint32_t draws;             // Total match stalemates
    uint32_t pvp_wins;          // 1v1 PvP victories
    uint32_t coop_wins;         // Co-op victories
    uint32_t highest_elo;       // Peak achieved rating
    uint8_t  reserved[48];      // For future stats/achievements
};

// sessions.bin record: Exactly 96 bytes
// Magic: 'P', 'V', 'Z', 'S' (0x50565A53)
struct SessionRecord {
    char     token[64];         // 64-character hexadecimal secure session token
    uint64_t user_id;           // Authenticated player ID
    uint64_t created_at;        // Token issue timestamp (ms)
    uint64_t expires_at;        // Token expiry timestamp (ms)
    uint8_t  is_revoked;        // 1 = logged out / revoked, 0 = valid
    uint8_t  padding[7];        // Align to 96 bytes
};

// config.bin record: Exactly 48 bytes (Header is 16 bytes, total file = 64 bytes)
// Magic: 'P', 'V', 'Z', 'C' (0x50565A43)
struct ConfigRecord {
    float    zombie_speed_multiplier;  // 1.0f default
    uint32_t sun_spawn_interval_sec;   // 7 default
    uint32_t max_plants_per_row;       // 5 default
    uint32_t action_rate_limit_x;      // 15 actions
    uint32_t action_rate_limit_y_sec;  // per 3 seconds
    uint32_t game_lock_state;          // 0 = active, 1 = frozen for maintenance
    uint32_t start_sun_amount;         // 150 sun default
    float    zombie_health_multiplier; // 1.0f default
    uint8_t  padding[16];              // Future runtime tunables
};

// matches.bin record: Exactly 64 bytes
// Magic: 'P', 'V', 'Z', 'M' (0x50565A4D)
struct MatchRecord {
    uint64_t match_id;           // Unique match ID
    uint64_t timestamp;          // Start timestamp (ms)
    uint64_t player1_id;         // User ID of Player 1 (Plant)
    uint64_t player2_id;         // User ID of Player 2 (Zombie or Co-op partner)
    uint8_t  winner_role;        // 0=Draw, 1=Plants, 2=Zombies
    uint8_t  match_mode;         // 1=PvP 1v1, 2=Co-op
    uint16_t duration_seconds;   // Match duration
    uint32_t p1_score;           // Final score for P1
    uint32_t p2_score;           // Final score for P2
    uint32_t replay_event_count; // Total logged actions in replays.dat
    uint64_t replay_byte_offset; // Byte offset into replays.dat
    uint8_t  padding[9];         // Align to 64 bytes
};

// match_players.bin record: Exactly 48 bytes
// Magic: 'P', 'V', 'M', 'P' (0x50564D50)
struct MatchPlayerRecord {
    uint64_t match_id;           // Matches.bin foreign key
    uint64_t user_id;            // Accounts.bin foreign key
    uint8_t  role;               // 1=Plant, 2=Zombie
    uint8_t  won;                // 1=Won, 0=Lost/Draw
    uint32_t elo_before;         // Rating prior to match
    uint32_t elo_after;          // Rating adjusted after match
    uint32_t plants_placed;      // Total plants deployed
    uint32_t zombies_spawned;    // Total zombies deployed
    uint32_t sun_collected;      // Total sun gathered
    uint8_t  padding[10];        // Align to 48 bytes
};

// replays.dat Event Record: Exactly 32 bytes (Append-only stream)
// Magic: 'P', 'V', 'Z', 'D' (0x50565A44)
struct ReplayEventRecord {
    uint64_t timestamp_ms;       // Offset from match start in ms
    uint64_t match_id;           // Match ID reference
    uint64_t player_id;          // User ID executing the action
    uint16_t action_type;        // 1=PlacePlant, 2=SpawnZombie, 3=Shovel, 4=SunCollect
    uint8_t  lane;               // 0..4 (Row)
    uint8_t  col;                // 0..8 (Column)
    uint32_t entity_id;          // PlantType, ZombieType, or SunID
    uint32_t extra_data;         // Extra payload / health / cost
};

// replays.idx Index Record: Exactly 24 bytes
// Magic: 'P', 'V', 'Z', 'X' (0x50565A58)
struct ReplayIndexRecord {
    uint64_t match_id;           // Match ID key
    uint64_t byte_offset;        // Byte offset in replays.dat
    uint32_t event_count;        // Count of ReplayEventRecords
    uint32_t padding;            // Align to 24 bytes
};

#pragma pack(pop)

// Magic constants
constexpr uint32_t MAGIC_ACCOUNTS      = 0x50565A41; // 'PVZA'
constexpr uint32_t MAGIC_PROFILES      = 0x50565A50; // 'PVZP'
constexpr uint32_t MAGIC_SESSIONS      = 0x50565A53; // 'PVZS'
constexpr uint32_t MAGIC_CONFIG        = 0x50565A43; // 'PVZC'
constexpr uint32_t MAGIC_MATCHES       = 0x50565A4D; // 'PVZM'
constexpr uint32_t MAGIC_MATCH_PLAYERS = 0x50564D50; // 'PVMP'
constexpr uint32_t MAGIC_REPLAY_DATA   = 0x50565A44; // 'PVZD'
constexpr uint32_t MAGIC_REPLAY_INDEX  = 0x50565A58; // 'PVZX'
constexpr uint32_t MAGIC_ARCHIVE_HUFF  = 0x50565A48; // 'PVZH'
