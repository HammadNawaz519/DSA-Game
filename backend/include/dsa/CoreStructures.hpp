#pragma once

#include <cstddef>
#include <stdexcept>

// 1. Dynamic 2D Array (Lawn Grid: Rows x Cols)
template <typename T>
class Grid2D {
private:
    size_t rows_;
    size_t cols_;
    T** data_;

public:
    Grid2D(size_t rows, size_t cols, const T& default_val = T()) 
        : rows_(rows), cols_(cols), data_(nullptr) {
        data_ = new T*[rows_];
        for (size_t r = 0; r < rows_; ++r) {
            data_[r] = new T[cols_];
            for (size_t c = 0; c < cols_; ++c) {
                data_[r][c] = default_val;
            }
        }
    }

    ~Grid2D() {
        if (data_) {
            for (size_t r = 0; r < rows_; ++r) {
                delete[] data_[r];
            }
            delete[] data_;
        }
    }

    // Rule of 5: Disallow accidental shallow copies
    Grid2D(const Grid2D&) = delete;
    Grid2D& operator=(const Grid2D&) = delete;

    size_t rows() const { return rows_; }
    size_t cols() const { return cols_; }

    T& at(size_t r, size_t c) {
        if (r >= rows_ || c >= cols_) {
            throw std::out_of_range("Grid2D index out of bounds");
        }
        return data_[r][c];
    }

    const T& at(size_t r, size_t c) const {
        if (r >= rows_ || c >= cols_) {
            throw std::out_of_range("Grid2D index out of bounds");
        }
        return data_[r][c];
    }
};

// 2. Custom Stack (Undo / Shovel Rollback)
template <typename T>
class MyStack {
private:
    struct Node {
        T data;
        Node* next;
        Node(const T& val, Node* n = nullptr) : data(val), next(n) {}
    };
    Node* top_node_;
    size_t size_;

public:
    MyStack() : top_node_(nullptr), size_(0) {}
    ~MyStack() { clear(); }

    void push(const T& val) {
        top_node_ = new Node(val, top_node_);
        size_++;
    }

    bool pop(T& out_val) {
        if (is_empty()) return false;
        Node* temp = top_node_;
        out_val = temp->data;
        top_node_ = top_node_->next;
        delete temp;
        size_--;
        return true;
    }

    bool peek(T& out_val) const {
        if (is_empty()) return false;
        out_val = top_node_->data;
        return true;
    }

    bool is_empty() const { return top_node_ == nullptr; }
    size_t size() const { return size_; }

    void clear() {
        while (top_node_) {
            Node* temp = top_node_;
            top_node_ = top_node_->next;
            delete temp;
        }
        size_ = 0;
    }
};

// 3. Circular Queue (Multi-Client Request Buffer for Single Worker Thread)
template <typename T, size_t Capacity = 1024>
class CircularQueue {
private:
    T buffer_[Capacity];
    size_t head_;
    size_t tail_;
    size_t count_;

public:
    CircularQueue() : head_(0), tail_(0), count_(0) {}

    bool enqueue(const T& item) {
        if (count_ >= Capacity) return false; // Full
        buffer_[tail_] = item;
        tail_ = (tail_ + 1) % Capacity;
        count_++;
        return true;
    }

    bool dequeue(T& out_item) {
        if (count_ == 0) return false; // Empty
        out_item = buffer_[head_];
        head_ = (head_ + 1) % Capacity;
        count_--;
        return true;
    }

    bool is_empty() const { return count_ == 0; }
    bool is_full() const { return count_ >= Capacity; }
    size_t size() const { return count_; }
};
