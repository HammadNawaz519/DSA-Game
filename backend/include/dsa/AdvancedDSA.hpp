#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>
#include <queue>
#include <cmath>
#include <random>
#include <cstring>

// 11. Breadth-First Search (BFS) for AoE Splash Shockwave
struct GridPos {
    int r, c;
};

class GridBFS {
public:
    static std::vector<GridPos> compute_splash(int center_r, int center_c, int radius, int max_r = 5, int max_c = 9) {
        std::vector<GridPos> affected;
        bool visited[5][9] = {false};

        std::vector<std::pair<GridPos, int>> q;
        q.push_back({{center_r, center_c}, 0});
        visited[center_r][center_c] = true;

        size_t head = 0;
        int dr[] = {-1, 1, 0, 0};
        int dc[] = {0, 0, -1, 1};

        while (head < q.size()) {
            auto curr = q[head++];
            affected.push_back(curr.first);

            if (curr.second < radius) {
                for (int i = 0; i < 4; ++i) {
                    int nr = curr.first.r + dr[i];
                    int nc = curr.first.c + dc[i];
                    if (nr >= 0 && nr < max_r && nc >= 0 && nc < max_c && !visited[nr][nc]) {
                        visited[nr][nc] = true;
                        q.push_back({{nr, nc}, curr.second + 1});
                    }
                }
            }
        }
        return affected;
    }
};

// 12. Depth-First Search (DFS) for Chain Reaction Explosions
class ChainReactorDFS {
public:
    static void trigger_chain(int r, int c, bool grid[5][9], std::vector<GridPos>& detonated) {
        if (r < 0 || r >= 5 || c < 0 || c >= 9 || !grid[r][c]) return;

        grid[r][c] = false; // Detonate
        detonated.push_back({r, c});

        // 8-directional propagation for sympathetic mine chain reactions
        for (int dr = -1; dr <= 1; ++dr) {
            for (int dc = -1; dc <= 1; ++dc) {
                if (dr == 0 && dc == 0) continue;
                trigger_chain(r + dr, c + dc, grid, detonated);
            }
        }
    }
};

// 13. Huffman Coding (Replay Snapshot File Compression/Decompression)
class HuffmanEncoder {
public:
    struct HNode {
        char ch;
        int freq;
        HNode* left;
        HNode* right;
        HNode(char c, int f) : ch(c), freq(f), left(nullptr), right(nullptr) {}
    };

    struct Compare {
        bool operator()(HNode* a, HNode* b) { return a->freq > b->freq; }
    };

    static void build_codes(HNode* root, const std::string& code, std::string codes[256]) {
        if (!root) return;
        if (!root->left && !root->right) {
            codes[static_cast<unsigned char>(root->ch)] = code;
        }
        build_codes(root->left, code + "0", codes);
        build_codes(root->right, code + "1", codes);
    }

    static void destroy(HNode* root) {
        if (!root) return;
        destroy(root->left);
        destroy(root->right);
        delete root;
    }

    static std::string compress(const std::string& input) {
        if (input.empty()) return "";
        int freq[256] = {0};
        for (char c : input) freq[static_cast<unsigned char>(c)]++;

        std::priority_queue<HNode*, std::vector<HNode*>, Compare> pq;
        for (int i = 0; i < 256; ++i) {
            if (freq[i] > 0) pq.push(new HNode(static_cast<char>(i), freq[i]));
        }

        if (pq.empty()) return "";

        while (pq.size() > 1) {
            HNode* left = pq.top(); pq.pop();
            HNode* right = pq.top(); pq.pop();
            HNode* parent = new HNode('\0', left->freq + right->freq);
            parent->left = left;
            parent->right = right;
            pq.push(parent);
        }

        HNode* root = pq.top();
        std::string codes[256];
        build_codes(root, "", codes);

        std::string encoded_bits = "";
        for (char c : input) {
            encoded_bits += codes[static_cast<unsigned char>(c)];
        }

        destroy(root);
        return encoded_bits;
    }
};

// 14. Bloom Filter (Username Ban-List & Collision Filter)
class BloomFilter {
private:
    uint8_t bitset_[1024]; // 8192 bits

    size_t hash1(const std::string& s) const {
        size_t h = 5381;
        for (char c : s) h = ((h << 5) + h) + c;
        return h % 8192;
    }

    size_t hash2(const std::string& s) const {
        size_t h = 0;
        for (char c : s) h = c + (h << 6) + (h << 16) - h;
        return h % 8192;
    }

    size_t hash3(const std::string& s) const {
        size_t h = 0x811c9dc5;
        for (char c : s) {
            h ^= static_cast<unsigned char>(c);
            h *= 0x01000193;
        }
        return h % 8192;
    }

public:
    BloomFilter() { std::memset(bitset_, 0, sizeof(bitset_)); }

    void add(const std::string& s) {
        size_t h1 = hash1(s), h2 = hash2(s), h3 = hash3(s);
        bitset_[h1 / 8] |= (1 << (h1 % 8));
        bitset_[h2 / 8] |= (1 << (h2 % 8));
        bitset_[h3 / 8] |= (1 << (h3 % 8));
    }

    bool possibly_contains(const std::string& s) const {
        size_t h1 = hash1(s), h2 = hash2(s), h3 = hash3(s);
        if (!(bitset_[h1 / 8] & (1 << (h1 % 8)))) return false;
        if (!(bitset_[h2 / 8] & (1 << (h2 % 8)))) return false;
        if (!(bitset_[h3 / 8] & (1 << (h3 % 8)))) return false;
        return true; // Possibly present (zero false negatives)
    }
};

// 15. Skip List (O(log n) Probabilistic Multi-Level Replay Event Timeline Scrubber)
template <typename Key, typename Value>
class SkipList {
private:
    static const int MAX_LEVEL = 16;
    struct SkipNode {
        Key key;
        Value val;
        SkipNode** forward;
        SkipNode(int level, const Key& k = Key(), const Value& v = Value())
            : key(k), val(v) {
            forward = new SkipNode*[level + 1];
            for (int i = 0; i <= level; ++i) forward[i] = nullptr;
        }
        ~SkipNode() { delete[] forward; }
    };

    SkipNode* header_;
    int level_;
    size_t size_;

    int random_level() {
        int lvl = 0;
        while ((std::rand() & 1) && lvl < MAX_LEVEL) lvl++;
        return lvl;
    }

public:
    SkipList() : level_(0), size_(0) {
        header_ = new SkipNode(MAX_LEVEL);
    }

    ~SkipList() {
        SkipNode* curr = header_;
        while (curr) {
            SkipNode* next = curr->forward[0];
            delete curr;
            curr = next;
        }
    }

    void insert(const Key& key, const Value& val) {
        SkipNode* update[MAX_LEVEL + 1];
        SkipNode* curr = header_;

        for (int i = level_; i >= 0; --i) {
            while (curr->forward[i] && curr->forward[i]->key < key) {
                curr = curr->forward[i];
            }
            update[i] = curr;
        }

        int rlevel = random_level();
        if (rlevel > level_) {
            for (int i = level_ + 1; i <= rlevel; ++i) update[i] = header_;
            level_ = rlevel;
        }

        SkipNode* n = new SkipNode(rlevel, key, val);
        for (int i = 0; i <= rlevel; ++i) {
            n->forward[i] = update[i]->forward[i];
            update[i]->forward[i] = n;
        }
        size_++;
    }

    bool search(const Key& key, Value& out_val) const {
        SkipNode* curr = header_;
        for (int i = level_; i >= 0; --i) {
            while (curr->forward[i] && curr->forward[i]->key < key) {
                curr = curr->forward[i];
            }
        }
        curr = curr->forward[0];
        if (curr && curr->key == key) {
            out_val = curr->val;
            return true;
        }
        return false;
    }

    size_t size() const { return size_; }
};
