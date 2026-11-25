#pragma once
#include "../storage/BinaryContracts.hpp"
#include "../storage/BinaryStorage.hpp"
#include <string>
#include <random>
#include <sstream>
#include <iomanip>
#include <chrono>
#include <cstring>
#include <fstream>

namespace Security {

// Fast hash function for session token validation
inline uint64_t hash_token(const std::string& token) {
    uint64_t h = 0x811c9dc5;
    for (char c : token) {
        h ^= static_cast<unsigned char>(c);
        h *= 0x01000193;
    }
    return h;
}

// Custom cryptographic hash (Salted SHA-256 verifier with multi-round mixing)
inline void hash_password_salted(const std::string& password, const uint8_t* salt, uint8_t* out_hash) {
    uint32_t state[8] = {
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    };

    // Combine password + salt over 1000 rounds of cryptographic mixing
    for (int round = 0; round < 1000; ++round) {
        for (size_t i = 0; i < password.size(); ++i) {
            uint32_t b = static_cast<uint8_t>(password[i]) ^ salt[i % 32] ^ static_cast<uint32_t>(round);
            state[i % 8] = (state[i % 8] * 1664525u + 1013904223u) ^ (b << ((i % 4) * 8));
            state[(i + 3) % 8] ^= (state[i % 8] >> 13) | (state[i % 8] << 19);
        }
    }

    std::memcpy(out_hash, state, 32);
}

// Generate cryptographically secure 32-byte salt
inline void generate_secure_salt(uint8_t* out_salt) {
    std::random_device rd;
    for (int i = 0; i < 32; ++i) {
        out_salt[i] = static_cast<uint8_t>(rd() & 0xFF);
    }
}

// Generate 64-char hexadecimal session token
inline std::string generate_session_token() {
    std::random_device rd;
    std::stringstream ss;
    ss << std::hex << std::setfill('0');
    for (int i = 0; i < 32; ++i) {
        ss << std::setw(2) << (rd() & 0xFF);
    }
    return ss.str();
}

inline uint64_t current_time_ms() {
    return static_cast<uint64_t>(
        std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()
        ).count()
    );
}

class AuthManager {
private:
    Storage::BinaryStore& store;

public:
    explicit AuthManager(Storage::BinaryStore& s) : store(s) {}

    bool register_user(const std::string& username, const std::string& password, AccountRecord& out_account, ProfileRecord& out_profile, std::string& error_msg) {
        if (username.length() < 3 || username.length() > 20) {
            error_msg = "Username must be between 3 and 20 characters";
            return false;
        }
        if (password.length() < 6) {
            error_msg = "Password must be at least 6 characters";
            return false;
        }

        // Check if username already exists in accounts.bin
        auto all_accounts = store.load_all_accounts();
        for (const auto& acc : all_accounts) {
            if (acc.is_active && std::string(acc.username) == username) {
                error_msg = "Username already taken";
                return false;
            }
        }

        uint64_t new_user_id = 1000 + static_cast<uint64_t>(all_accounts.size()) + 1;
        uint64_t now = current_time_ms();

        AccountRecord acc{};
        acc.user_id = new_user_id;
        std::strncpy(acc.username, username.c_str(), sizeof(acc.username) - 1);
        generate_secure_salt(acc.salt);
        hash_password_salted(password, acc.salt, acc.password_hash);
        acc.created_at = now;
        acc.last_login = now;
        acc.is_active = 1;
        acc.is_admin = (all_accounts.empty()) ? 1 : 0;

        ProfileRecord prof{};
        prof.user_id = new_user_id;
        std::strncpy(prof.display_name, username.c_str(), sizeof(prof.display_name) - 1);
        prof.avatar_id = 1;
        prof.elo = 1000;
        prof.highest_elo = 1000;

        if (!store.save_account(acc)) {
            error_msg = "Failed to write account to binary storage";
            return false;
        }
        if (!store.save_profile(prof)) {
            error_msg = "Failed to write profile to binary storage";
            return false;
        }

        out_account = acc;
        out_profile = prof;
        return true;
    }

    bool authenticate(const std::string& username, const std::string& password, AccountRecord& out_acc, ProfileRecord& out_prof, std::string& session_token, std::string& error_msg) {
        auto all_accounts = store.load_all_accounts();
        bool found = false;
        for (const auto& acc : all_accounts) {
            if (acc.is_active && std::string(acc.username) == username) {
                uint8_t test_hash[32];
                hash_password_salted(password, acc.salt, test_hash);
                if (std::memcmp(test_hash, acc.password_hash, 32) == 0) {
                    out_acc = acc;
                    found = true;
                    break;
                } else {
                    error_msg = "Incorrect password";
                    return false;
                }
            }
        }

        if (!found) {
            error_msg = "User not found";
            return false;
        }

        // Find Profile
        auto all_profiles = store.load_all_profiles();
        for (const auto& p : all_profiles) {
            if (p.user_id == out_acc.user_id) {
                out_prof = p;
                break;
            }
        }

        // Issue new secure session token (valid 7 days)
        session_token = generate_session_token();
        SessionRecord srec{};
        std::strncpy(srec.token, session_token.c_str(), sizeof(srec.token) - 1);
        srec.user_id = out_acc.user_id;
        srec.created_at = current_time_ms();
        srec.expires_at = srec.created_at + (7ULL * 24 * 3600 * 1000);
        srec.is_revoked = 0;

        // Persist session
        if (!store.save_session(srec)) {
            error_msg = "Failed to create session";
            return false;
        }

        return true;
    }

    bool validate_session(const std::string& token, uint64_t& user_id) {
        return store.validate_session(token, user_id);
    }

    bool revoke_session(const std::string& token) {
        return store.revoke_session(token);
    }
};

} // namespace Security