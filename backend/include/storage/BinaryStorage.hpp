#pragma once

#include "BinaryContracts.hpp"
#include <string>
#include <fstream>
#include <vector>
#include <mutex>
#include <filesystem>
#include <iostream>

namespace Storage {

// Helper to get data directory path
inline std::string get_data_dir() {
    const char* env_data = std::getenv("DATA_DIR");
    if (env_data) return std::string(env_data);
    return "./data";
}

class BinaryStore {
private:
    std::string data_dir;
    std::mutex io_mutex;
    std::mutex config_mutex;

    std::string get_path(const std::string& filename) const {
        return data_dir + "/" + filename;
    }

public:
    explicit BinaryStore(const std::string& dir = "/app/data") : data_dir(dir) {
        std::filesystem::create_directories(data_dir);
        init_all_files();
    }

    const std::string& get_data_dir() const { return data_dir; }

    void init_all_files() {
        std::lock_guard<std::mutex> lock(io_mutex);
        init_file_if_empty(get_path("accounts.bin"), MAGIC_ACCOUNTS, 1, sizeof(AccountRecord));
        init_file_if_empty(get_path("profiles.bin"), MAGIC_PROFILES, 1, sizeof(ProfileRecord));
        init_file_if_empty(get_path("sessions.bin"), MAGIC_SESSIONS, 1, sizeof(SessionRecord));
        init_file_if_empty(get_path("matches.bin"), MAGIC_MATCHES, 1, sizeof(MatchRecord));
        init_file_if_empty(get_path("match_players.bin"), MAGIC_MATCH_PLAYERS, 1, sizeof(MatchPlayerRecord));
        init_file_if_empty(get_path("replays.idx"), MAGIC_REPLAY_INDEX, 1, sizeof(ReplayIndexRecord));

        // Config file initialization
        std::string cfg_path = get_path("config.bin");
        if (!std::filesystem::exists(cfg_path) || std::filesystem::file_size(cfg_path) < sizeof(FileHeader) + sizeof(ConfigRecord)) {
            std::ofstream out(cfg_path, std::ios::binary | std::ios::trunc);
            FileHeader hdr{MAGIC_CONFIG, 1, 1, sizeof(ConfigRecord)};
            ConfigRecord cfg{
                1.0f,   // zombie_speed_multiplier
                7,      // sun_spawn_interval_sec
                5,      // max_plants_per_row
                15,     // action_rate_limit_x
                3,      // action_rate_limit_y_sec
                0,      // game_lock_state (0=active)
                150,    // start_sun_amount
                1.0f,   // zombie_health_multiplier
                {0}
            };
            out.write(reinterpret_cast<const char*>(&hdr), sizeof(FileHeader));
            out.write(reinterpret_cast<const char*>(&cfg), sizeof(ConfigRecord));
            out.flush();
        }

        // Replays append-only log initialization
        std::string replays_path = get_path("replays.dat");
        if (!std::filesystem::exists(replays_path)) {
            std::ofstream out(replays_path, std::ios::binary | std::ios::trunc);
            FileHeader hdr{MAGIC_REPLAY_DATA, 1, 0, sizeof(ReplayEventRecord)};
            out.write(reinterpret_cast<const char*>(&hdr), sizeof(FileHeader));
            out.flush();
        }
    }

    void init_file_if_empty(const std::string& path, uint32_t magic, uint32_t ver, uint32_t rec_size) {
        if (!std::filesystem::exists(path) || std::filesystem::file_size(path) < sizeof(FileHeader)) {
            std::ofstream out(path, std::ios::binary | std::ios::trunc);
            FileHeader hdr{magic, ver, 0, rec_size};
            out.write(reinterpret_cast<const char*>(&hdr), sizeof(FileHeader));
            out.flush();
        }
    }

    // --- ACCOUNT OPERATIONS ---
    bool save_account(const AccountRecord& record, uint32_t* out_index = nullptr) {
        std::lock_guard<std::mutex> lock(io_mutex);
        std::string path = get_path("accounts.bin");

        std::fstream file(path, std::ios::in | std::ios::out | std::ios::binary);
        if (!file.is_open()) return false;

        FileHeader hdr;
        file.read(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        if (hdr.magic != MAGIC_ACCOUNTS) return false;

        uint32_t record_idx = hdr.record_count;
        uint64_t offset = sizeof(FileHeader) + static_cast<uint64_t>(record_idx) * sizeof(AccountRecord);

        file.seekp(offset, std::ios::beg);
        file.write(reinterpret_cast<const char*>(&record), sizeof(AccountRecord));

        hdr.record_count++;
        file.seekp(0, std::ios::beg);
        file.write(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        file.flush();

        if (out_index) *out_index = record_idx;
        return true;
    }

    bool update_account(uint32_t index, const AccountRecord& record) {
        std::lock_guard<std::mutex> lock(io_mutex);
        std::string path = get_path("accounts.bin");

        std::fstream file(path, std::ios::in | std::ios::out | std::ios::binary);
        if (!file.is_open()) return false;

        uint64_t offset = sizeof(FileHeader) + static_cast<uint64_t>(index) * sizeof(AccountRecord);
        file.seekp(offset, std::ios::beg);
        file.write(reinterpret_cast<const char*>(&record), sizeof(AccountRecord));
        file.flush();
        return true;
    }

    bool get_account(uint32_t index, AccountRecord& out_record) {
        std::lock_guard<std::mutex> lock(io_mutex);
        std::string path = get_path("accounts.bin");

        std::ifstream file(path, std::ios::binary);
        if (!file.is_open()) return false;

        uint64_t offset = sizeof(FileHeader) + static_cast<uint64_t>(index) * sizeof(AccountRecord);
        file.seekg(offset, std::ios::beg);
        file.read(reinterpret_cast<char*>(&out_record), sizeof(AccountRecord));
        return file.gcount() == sizeof(AccountRecord);
    }

    bool get_account_by_user_id(uint64_t user_id, AccountRecord& out_record) {
        std::lock_guard<std::mutex> lock(io_mutex);
        std::string path = get_path("accounts.bin");

        std::ifstream file(path, std::ios::binary);
        if (!file.is_open()) return false;

        FileHeader hdr;
        file.read(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        if (hdr.magic != MAGIC_ACCOUNTS) return false;

        for (uint32_t i = 0; i < hdr.record_count; i++) {
            AccountRecord temp;
            uint64_t offset = sizeof(FileHeader) + static_cast<uint64_t>(i) * sizeof(AccountRecord);
            file.seekg(offset, std::ios::beg);
            file.read(reinterpret_cast<char*>(&temp), sizeof(AccountRecord));
            if (temp.user_id == user_id) {
                out_record = temp;
                return true;
            }
        }
        return false;
    }

    std::vector<AccountRecord> load_all_accounts() {
        std::lock_guard<std::mutex> lock(io_mutex);
        std::vector<AccountRecord> records;
        std::string path = get_path("accounts.bin");

        std::ifstream file(path, std::ios::binary);
        if (!file.is_open()) return records;

        FileHeader hdr;
        file.read(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        if (hdr.magic != MAGIC_ACCOUNTS) return records;

        records.resize(hdr.record_count);
        file.read(reinterpret_cast<char*>(records.data()), static_cast<std::streamsize>(hdr.record_count * sizeof(AccountRecord)));
        return records;
    }

    // --- PROFILE OPERATIONS ---
    bool save_profile(const ProfileRecord& record) {
        std::lock_guard<std::mutex> lock(io_mutex);
        std::string path = get_path("profiles.bin");

        std::fstream file(path, std::ios::in | std::ios::out | std::ios::binary);
        if (!file.is_open()) return false;

        FileHeader hdr;
        file.read(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        if (hdr.magic != MAGIC_PROFILES) return false;

        uint64_t offset = sizeof(FileHeader) + static_cast<uint64_t>(hdr.record_count) * sizeof(ProfileRecord);
        file.seekp(offset, std::ios::beg);
        file.write(reinterpret_cast<const char*>(&record), sizeof(ProfileRecord));

        hdr.record_count++;
        file.seekp(0, std::ios::beg);
        file.write(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        file.flush();
        return true;
    }

    bool update_profile_by_user_id(uint64_t user_id, const ProfileRecord& updated) {
        std::lock_guard<std::mutex> lock(io_mutex);
        std::string path = get_path("profiles.bin");
        std::fstream file(path, std::ios::in | std::ios::out | std::ios::binary);
        if (!file.is_open()) return false;

        FileHeader hdr;
        file.read(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        if (hdr.magic != MAGIC_PROFILES) return false;

        ProfileRecord temp;
        for (uint32_t i = 0; i < hdr.record_count; i++) {
            uint64_t offset = sizeof(FileHeader) + static_cast<uint64_t>(i) * sizeof(ProfileRecord);
            file.seekg(offset, std::ios::beg);
            file.read(reinterpret_cast<char*>(&temp), sizeof(ProfileRecord));
            if (temp.user_id == user_id) {
                file.seekp(offset, std::ios::beg);
                file.write(reinterpret_cast<const char*>(&updated), sizeof(ProfileRecord));
                file.flush();
                return true;
            }
        }
        return false;
    }

    bool get_profile_by_user_id(uint64_t user_id, ProfileRecord& out_record) {
        std::lock_guard<std::mutex> lock(io_mutex);
        std::string path = get_path("profiles.bin");
        std::ifstream file(path, std::ios::binary);
        if (!file.is_open()) return false;

        FileHeader hdr;
        file.read(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        if (hdr.magic != MAGIC_PROFILES) return false;

        for (uint32_t i = 0; i < hdr.record_count; i++) {
            uint64_t offset = sizeof(FileHeader) + static_cast<uint64_t>(i) * sizeof(ProfileRecord);
            file.seekg(offset, std::ios::beg);
            file.read(reinterpret_cast<char*>(&out_record), sizeof(ProfileRecord));
            if (out_record.user_id == user_id) return true;
        }
        return false;
    }

    std::vector<ProfileRecord> load_all_profiles() {
        std::lock_guard<std::mutex> lock(io_mutex);
        std::vector<ProfileRecord> list;
        std::string path = get_path("profiles.bin");

        std::ifstream file(path, std::ios::binary);
        if (!file.is_open()) return list;

        FileHeader hdr;
        file.read(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        if (hdr.magic != MAGIC_PROFILES) return list;

        list.resize(hdr.record_count);
        file.read(reinterpret_cast<char*>(list.data()), static_cast<std::streamsize>(hdr.record_count * sizeof(ProfileRecord)));
        return list;
    }

    // --- SESSION OPERATIONS ---
    bool save_session(const SessionRecord& record) {
        std::lock_guard<std::mutex> lock(io_mutex);
        std::string path = get_path("sessions.bin");

        std::fstream file(path, std::ios::in | std::ios::out | std::ios::binary);
        if (!file.is_open()) return false;

        FileHeader hdr;
        file.read(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        if (hdr.magic != MAGIC_SESSIONS) return false;

        // Check if session already exists, update it
        for (uint32_t i = 0; i < hdr.record_count; i++) {
            SessionRecord temp;
            uint64_t offset = sizeof(FileHeader) + static_cast<uint64_t>(i) * sizeof(SessionRecord);
            file.seekg(offset, std::ios::beg);
            file.read(reinterpret_cast<char*>(&temp), sizeof(SessionRecord));
            if (std::string(temp.token) == std::string(record.token)) {
                file.seekp(offset, std::ios::beg);
                file.write(reinterpret_cast<const char*>(&record), sizeof(SessionRecord));
                file.flush();
                return true;
            }
        }

        // New session
        uint64_t file_offset = sizeof(FileHeader) + static_cast<uint64_t>(hdr.record_count) * sizeof(SessionRecord);
        file.seekp(file_offset, std::ios::beg);
        file.write(reinterpret_cast<const char*>(&record), sizeof(SessionRecord));

        hdr.record_count++;
        file.seekp(0, std::ios::beg);
        file.write(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        file.flush();
        return true;
    }

    bool validate_session(const std::string& token, uint64_t& out_user_id) {
        std::lock_guard<std::mutex> lock(io_mutex);
        std::string path = get_path("sessions.bin");
        std::ifstream file(path, std::ios::binary);
        if (!file.is_open()) return false;

        FileHeader hdr;
        file.read(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        if (hdr.magic != MAGIC_SESSIONS) return false;

        uint64_t now = Security::current_time_ms();
        for (uint32_t i = 0; i < hdr.record_count; i++) {
            SessionRecord temp;
            uint64_t offset = sizeof(FileHeader) + static_cast<uint64_t>(i) * sizeof(SessionRecord);
            file.seekg(offset, std::ios::beg);
            file.read(reinterpret_cast<char*>(&temp), sizeof(SessionRecord));

            if (std::string(temp.token) == token && !temp.is_revoked && temp.expires_at > now) {
                out_user_id = temp.user_id;
                return true;
            }
        }
        return false;
    }

    bool revoke_session(const std::string& token) {
        std::lock_guard<std::mutex> lock(io_mutex);
        std::string path = get_path("sessions.bin");
        std::fstream file(path, std::ios::in | std::ios::out | std::ios::binary);
        if (!file.is_open()) return false;

        FileHeader hdr;
        file.read(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        if (hdr.magic != MAGIC_SESSIONS) return false;

        for (uint32_t i = 0; i < hdr.record_count; i++) {
            SessionRecord temp;
            uint64_t offset = sizeof(FileHeader) + static_cast<uint64_t>(i) * sizeof(SessionRecord);
            file.seekg(offset, std::ios::beg);
            file.read(reinterpret_cast<char*>(&temp), sizeof(SessionRecord));

            if (std::string(temp.token) == token) {
                temp.is_revoked = 1;
                file.seekp(offset, std::ios::beg);
                file.write(reinterpret_cast<const char*>(&temp), sizeof(SessionRecord));
                file.flush();
                return true;
            }
        }
        return false;
    }

    // --- CONFIG OPERATIONS ---
    bool load_config(ConfigRecord& out_cfg) {
        std::lock_guard<std::mutex> lock(io_mutex);
        std::string path = get_path("config.bin");
        std::ifstream file(path, std::ios::binary);
        if (!file.is_open()) return false;

        FileHeader hdr;
        file.read(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        if (hdr.magic != MAGIC_CONFIG) return false;

        file.read(reinterpret_cast<char*>(&out_cfg), sizeof(ConfigRecord));
        return true;
    }

    bool save_config(const ConfigRecord& cfg) {
        std::lock_guard<std::mutex> lock(io_mutex);
        std::string path = get_path("config.bin");
        std::fstream file(path, std::ios::in | std::ios::out | std::ios::binary);
        if (!file.is_open()) return false;

        file.seekp(sizeof(FileHeader), std::ios::beg);
        file.write(reinterpret_cast<const char*>(&cfg), sizeof(ConfigRecord));
        file.flush();
        return true;
    }

    // --- REPLAY LOGGING (APPEND-ONLY) ---
    uint64_t append_replay_event(const ReplayEventRecord& ev) {
        std::lock_guard<std::mutex> lock(io_mutex);
        std::string path = get_path("replays.dat");
        std::fstream file(path, std::ios::in | std::ios::out | std::ios::binary);
        if (!file.is_open()) return 0;

        file.seekp(0, std::ios::end);
        uint64_t offset = static_cast<uint64_t>(file.tellp());
        file.write(reinterpret_cast<const char*>(&ev), sizeof(ReplayEventRecord));
        file.flush();

        // Update header count
        FileHeader hdr;
        file.seekg(0, std::ios::beg);
        file.read(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        hdr.record_count++;
        file.seekp(0, std::ios::beg);
        file.write(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        file.flush();

        return offset;
    }

    bool get_replay_events(uint64_t byte_offset, std::vector<ReplayEventRecord>& events) {
        std::lock_guard<std::mutex> lock(io_mutex);
        std::string path = get_path("replays.dat");
        std::ifstream file(path, std::ios::binary);
        if (!file.is_open()) return false;

        // Read header to get event count
        FileHeader hdr;
        file.read(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        if (hdr.magic != MAGIC_REPLAY_DATA) return false;

        // Seek to start of events
        file.seekg(byte_offset, std::ios::beg);

        ReplayEventRecord ev;
        while (file.read(reinterpret_cast<char*>(&ev), sizeof(ReplayEventRecord))) {
            events.push_back(ev);
        }
        return true;
    }

    // --- MATCH RECORD OPERATIONS ---
    bool save_match_record(const MatchRecord& record, uint64_t& out_match_id) {
        std::lock_guard<std::mutex> lock(io_mutex);
        std::string path = get_path("matches.bin");

        std::fstream file(path, std::ios::in | std::ios::out | std::ios::binary);
        if (!file.is_open()) return false;

        FileHeader hdr;
        file.read(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        if (hdr.magic != MAGIC_MATCHES) return false;

        out_match_id = record.match_id;
        uint64_t offset = sizeof(FileHeader) + static_cast<uint64_t>(hdr.record_count) * sizeof(MatchRecord);
        file.seekp(offset, std::ios::beg);
        file.write(reinterpret_cast<const char*>(&record), sizeof(MatchRecord));

        hdr.record_count++;
        file.seekp(0, std::ios::beg);
        file.write(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        file.flush();
        return true;
    }

    // --- MATCH PLAYER RECORD OPERATIONS ---
    bool save_match_player_record(const MatchPlayerRecord& record) {
        std::lock_guard<std::mutex> lock(io_mutex);
        std::string path = get_path("match_players.bin");

        std::fstream file(path, std::ios::in | std::ios::out | std::ios::binary);
        if (!file.is_open()) return false;

        FileHeader hdr;
        file.read(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        if (hdr.magic != MAGIC_MATCH_PLAYERS) return false;

        uint64_t offset = sizeof(FileHeader) + static_cast<uint64_t>(hdr.record_count) * sizeof(MatchPlayerRecord);
        file.seekp(offset, std::ios::beg);
        file.write(reinterpret_cast<const char*>(&record), sizeof(MatchPlayerRecord));

        hdr.record_count++;
        file.seekp(0, std::ios::beg);
        file.write(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        file.flush();
        return true;
    }

    // --- REPLAY INDEX OPERATIONS ---
    bool save_replay_index(const ReplayIndexRecord& record) {
        std::lock_guard<std::mutex> lock(io_mutex);
        std::string path = get_path("replays.idx");

        std::fstream file(path, std::ios::in | std::ios::out | std::ios::binary);
        if (!file.is_open()) return false;

        FileHeader hdr;
        file.read(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        if (hdr.magic != MAGIC_REPLAY_INDEX) return false;

        // Check if index exists for this match_id
        for (uint32_t i = 0; i < hdr.record_count; i++) {
            ReplayIndexRecord temp;
            uint64_t offset = sizeof(FileHeader) + static_cast<uint64_t>(i) * sizeof(ReplayIndexRecord);
            file.seekg(offset, std::ios::beg);
            file.read(reinterpret_cast<char*>(&temp), sizeof(ReplayIndexRecord));

            if (temp.match_id == record.match_id) {
                file.seekp(offset, std::ios::beg);
                file.write(reinterpret_cast<const char*>(&record), sizeof(ReplayIndexRecord));
                file.flush();
                return true;
            }
        }

        // New index
        uint64_t file_offset = sizeof(FileHeader) + static_cast<uint64_t>(hdr.record_count) * sizeof(ReplayIndexRecord);
        file.seekp(file_offset, std::ios::beg);
        file.write(reinterpret_cast<const char*>(&record), sizeof(ReplayIndexRecord));

        hdr.record_count++;
        file.seekp(0, std::ios::beg);
        file.write(reinterpret_cast<char*>(&hdr), sizeof(FileHeader));
        file.flush();
        return true;
    }
};

} // namespace Storage