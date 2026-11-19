#pragma once

#include <cstddef>
#include <string>
#include <algorithm>
#include <functional>
#include <vector>

// 7. Almanac Tree with 4 Traversals (Pre, In, Post, Level Order)
struct AlmanacNode {
    int id;
    std::string name;
    std::string role;
    AlmanacNode* left;
    AlmanacNode* right;

    AlmanacNode(int i, const std::string& n, const std::string& r)
        : id(i), name(n), role(r), left(nullptr), right(nullptr) {}
};

class AlmanacTree {
public:
    AlmanacNode* root;

    AlmanacTree() : root(nullptr) {}
    ~AlmanacTree() { destroy(root); }

    void insert(int id, const std::string& name, const std::string& role) {
        root = insert_rec(root, id, name, role);
    }

    void pre_order(AlmanacNode* node, std::vector<std::string>& out) const {
        if (!node) return;
        out.push_back(node->name + " [" + node->role + "]");
        pre_order(node->left, out);
        pre_order(node->right, out);
    }

    void in_order(AlmanacNode* node, std::vector<std::string>& out) const {
        if (!node) return;
        in_order(node->left, out);
        out.push_back(node->name + " [" + node->role + "]");
        in_order(node->right, out);
    }

    void post_order(AlmanacNode* node, std::vector<std::string>& out) const {
        if (!node) return;
        post_order(node->left, out);
        post_order(node->right, out);
        out.push_back(node->name + " [" + node->role + "]");
    }

    void level_order(std::vector<std::string>& out) const {
        if (!root) return;
        std::vector<AlmanacNode*> queue;
        queue.push_back(root);
        size_t head = 0;
        while (head < queue.size()) {
            AlmanacNode* curr = queue[head++];
            out.push_back(curr->name + " [" + curr->role + "]");
            if (curr->left) queue.push_back(curr->left);
            if (curr->right) queue.push_back(curr->right);
        }
    }

private:
    AlmanacNode* insert_rec(AlmanacNode* node, int id, const std::string& name, const std::string& role) {
        if (!node) return new AlmanacNode(id, name, role);
        if (id < node->id) node->left = insert_rec(node->left, id, name, role);
        else node->right = insert_rec(node->right, id, name, role);
        return node;
    }

    void destroy(AlmanacNode* node) {
        if (!node) return;
        destroy(node->left);
        destroy(node->right);
        delete node;
    }
};

// 8. Custom BST (Match Room Directory Search by Room Name)
template <typename T>
class RoomBST {
private:
    struct BSTNode {
        std::string key;
        T val;
        BSTNode* left;
        BSTNode* right;
        BSTNode(const std::string& k, const T& v) 
            : key(k), val(v), left(nullptr), right(nullptr) {}
    };
    BSTNode* root_;
    size_t size_;

    BSTNode* insert_internal(BSTNode* node, const std::string& key, const T& val) {
        if (!node) {
            size_++;
            return new BSTNode(key, val);
        }
        if (key < node->key) node->left = insert_internal(node->left, key, val);
        else if (key > node->key) node->right = insert_internal(node->right, key, val);
        else node->val = val; // update
        return node;
    }

    BSTNode* search_internal(BSTNode* node, const std::string& key) const {
        if (!node || node->key == key) return node;
        if (key < node->key) return search_internal(node->left, key);
        return search_internal(node->right, key);
    }

    void destroy(BSTNode* node) {
        if (!node) return;
        destroy(node->left);
        destroy(node->right);
        delete node;
    }

public:
    RoomBST() : root_(nullptr), size_(0) {}
    ~RoomBST() { destroy(root_); }

    void insert(const std::string& key, const T& val) {
        root_ = insert_internal(root_, key, val);
    }

    bool search(const std::string& key, T& out_val) const {
        BSTNode* n = search_internal(root_, key);
        if (!n) return false;
        out_val = n->val;
        return true;
    }

    size_t size() const { return size_; }
};

// 9. Custom AVL Tree (Strictly Balanced O(log n) Global Leaderboard)
template <typename Key, typename Value>
class AVLTree {
public:
    struct AVLNode {
        Key key;
        Value value;
        int height;
        AVLNode* left;
        AVLNode* right;
        AVLNode(const Key& k, const Value& v)
            : key(k), value(v), height(1), left(nullptr), right(nullptr) {}
    };

private:
    AVLNode* root_;
    size_t size_;

    int get_height(AVLNode* n) const { return n ? n->height : 0; }
    int get_balance(AVLNode* n) const { return n ? get_height(n->left) - get_height(n->right) : 0; }

    AVLNode* rotate_right(AVLNode* y) {
        AVLNode* x = y->left;
        AVLNode* T2 = x->right;
        x->right = y;
        y->left = T2;
        y->height = 1 + std::max(get_height(y->left), get_height(y->right));
        x->height = 1 + std::max(get_height(x->left), get_height(x->right));
        return x;
    }

    AVLNode* rotate_left(AVLNode* x) {
        AVLNode* y = x->right;
        AVLNode* T2 = y->left;
        y->left = x;
        x->right = T2;
        x->height = 1 + std::max(get_height(x->left), get_height(x->right));
        y->height = 1 + std::max(get_height(y->left), get_height(y->right));
        return y;
    }

    AVLNode* insert_internal(AVLNode* node, const Key& key, const Value& value) {
        if (!node) {
            size_++;
            return new AVLNode(key, value);
        }

        if (key > node->key) { // Descending sort for leaderboard (higher key first)
            node->left = insert_internal(node->left, key, value);
        } else if (key < node->key) {
            node->right = insert_internal(node->right, key, value);
        } else {
            node->value = value;
            return node;
        }

        node->height = 1 + std::max(get_height(node->left), get_height(node->right));
        int balance = get_balance(node);

        // LL Rotation
        if (balance > 1 && key > node->left->key)
            return rotate_right(node);

        // RR Rotation
        if (balance < -1 && key < node->right->key)
            return rotate_left(node);

        // LR Rotation
        if (balance > 1 && key < node->left->key) {
            node->left = rotate_left(node->left);
            return rotate_right(node);
        }

        // RL Rotation
        if (balance < -1 && key > node->right->key) {
            node->right = rotate_right(node->right);
            return rotate_left(node);
        }

        return node;
    }

    void in_order_traverse(AVLNode* node, std::vector<std::pair<Key, Value>>& out) const {
        if (!node) return;
        in_order_traverse(node->left, out);
        out.push_back({node->key, node->value});
        in_order_traverse(node->right, out);
    }

    void destroy(AVLNode* node) {
        if (!node) return;
        destroy(node->left);
        destroy(node->right);
        delete node;
    }

public:
    AVLTree() : root_(nullptr), size_(0) {}
    ~AVLTree() { destroy(root_); }

    void insert(const Key& key, const Value& value) {
        root_ = insert_internal(root_, key, value);
    }

    std::vector<std::pair<Key, Value>> get_sorted_records() const {
        std::vector<std::pair<Key, Value>> records;
        in_order_traverse(root_, records);
        return records;
    }

    size_t size() const { return size_; }
};

// 10. Custom Hash Table with Quadratic Probing and Prime Rehashing
template <typename Key, typename Value>
class CustomHashTable {
private:
    struct Entry {
        Key key;
        Value value;
        bool occupied;
        bool deleted;
        Entry() : occupied(false), deleted(false) {}
    };

    Entry* table_;
    size_t capacity_;
    size_t count_;

    static const size_t PRIMES[];
    size_t prime_index_;

    size_t hash_func(const Key& key) const {
        std::hash<Key> hasher;
        return hasher(key) % capacity_;
    }

    void rehash() {
        size_t old_cap = capacity_;
        Entry* old_table = table_;

        prime_index_++;
        capacity_ = PRIMES[prime_index_];
        table_ = new Entry[capacity_];
        count_ = 0;

        for (size_t i = 0; i < old_cap; ++i) {
            if (old_table[i].occupied && !old_table[i].deleted) {
                insert(old_table[i].key, old_table[i].value);
            }
        }
        delete[] old_table;
    }

public:
    explicit CustomHashTable(size_t prime_idx = 2) 
        : prime_index_(prime_idx), count_(0) {
        capacity_ = PRIMES[prime_index_];
        table_ = new Entry[capacity_];
    }

    ~CustomHashTable() { delete[] table_; }

    void insert(const Key& key, const Value& val) {
        if (static_cast<double>(count_) / capacity_ > 0.65) {
            rehash();
        }

        size_t h = hash_func(key);
        size_t i = 0;
        size_t first_deleted = capacity_;

        while (i < capacity_) {
            size_t idx = (h + i * i) % capacity_;
            if (table_[idx].occupied) {
                if (table_[idx].deleted && first_deleted == capacity_) {
                    first_deleted = idx;
                } else if (!table_[idx].deleted && table_[idx].key == key) {
                    table_[idx].value = val; // Update
                    return;
                }
            } else {
                size_t target = (first_deleted != capacity_) ? first_deleted : idx;
                table_[target].key = key;
                table_[target].value = val;
                table_[target].occupied = true;
                table_[target].deleted = false;
                count_++;
                return;
            }
            i++;
        }

        if (first_deleted != capacity_) {
            table_[first_deleted].key = key;
            table_[first_deleted].value = val;
            table_[first_deleted].occupied = true;
            table_[first_deleted].deleted = false;
            count_++;
        }
    }

    bool get(const Key& key, Value& out_val) const {
        size_t h = hash_func(key);
        size_t i = 0;
        while (i < capacity_) {
            size_t idx = (h + i * i) % capacity_;
            if (!table_[idx].occupied) return false;
            if (table_[idx].occupied && !table_[idx].deleted && table_[idx].key == key) {
                out_val = table_[idx].value;
                return true;
            }
            i++;
        }
        return false;
    }

    bool remove(const Key& key) {
        size_t h = hash_func(key);
        size_t i = 0;
        while (i < capacity_) {
            size_t idx = (h + i * i) % capacity_;
            if (!table_[idx].occupied) return false;
            if (!table_[idx].deleted && table_[idx].key == key) {
                table_[idx].deleted = true;
                count_--;
                return true;
            }
            i++;
        }
        return false;
    }

    size_t size() const { return count_; }
};

template <typename Key, typename Value>
const size_t CustomHashTable<Key, Value>::PRIMES[] = {
    31, 67, 131, 257, 521, 1031, 2053, 4099, 8209, 16411
};
