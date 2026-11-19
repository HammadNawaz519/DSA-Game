#pragma once

#include <cstddef>
#include <utility>
#include <functional>

// 4. Custom Sorting (MergeSort and QuickSort)
namespace MySort {

template <typename T, typename Compare = std::less<T>>
void merge(T arr[], size_t left, size_t mid, size_t right, Compare comp = Compare()) {
    size_t n1 = mid - left + 1;
    size_t n2 = right - mid;

    T* L = new T[n1];
    T* R = new T[n2];

    for (size_t i = 0; i < n1; ++i) L[i] = arr[left + i];
    for (size_t j = 0; j < n2; ++j) R[j] = arr[mid + 1 + j];

    size_t i = 0, j = 0, k = left;
    while (i < n1 && j < n2) {
        if (comp(L[i], R[j]) || (!comp(R[j], L[i]))) {
            arr[k++] = L[i++];
        } else {
            arr[k++] = R[j++];
        }
    }

    while (i < n1) arr[k++] = L[i++];
    while (j < n2) arr[k++] = R[j++];

    delete[] L;
    delete[] R;
}

template <typename T, typename Compare = std::less<T>>
void merge_sort(T arr[], size_t left, size_t right, Compare comp = Compare()) {
    if (left < right) {
        size_t mid = left + (right - left) / 2;
        merge_sort(arr, left, mid, comp);
        merge_sort(arr, mid + 1, right, comp);
        merge(arr, left, mid, right, comp);
    }
}

template <typename T, typename Compare = std::less<T>>
size_t partition(T arr[], size_t low, size_t high, Compare comp = Compare()) {
    T pivot = arr[high];
    size_t i = low;
    for (size_t j = low; j < high; ++j) {
        if (comp(arr[j], pivot)) {
            std::swap(arr[i], arr[j]);
            i++;
        }
    }
    std::swap(arr[i], arr[high]);
    return i;
}

template <typename T, typename Compare = std::less<T>>
void quick_sort(T arr[], size_t low, size_t high, Compare comp = Compare()) {
    if (low < high) {
        size_t pi = partition(arr, low, high, comp);
        if (pi > 0) quick_sort(arr, low, pi - 1, comp);
        quick_sort(arr, pi + 1, high, comp);
    }
}

} // namespace MySort

// 5. Custom Min-Heap (Priority Queue for Discrete Game Event Ticks)
template <typename T, typename Compare = std::less<T>>
class MyMinHeap {
private:
    T* data_;
    size_t capacity_;
    size_t size_;
    Compare comp_;

    void sift_up(size_t idx) {
        while (idx > 0) {
            size_t parent = (idx - 1) / 2;
            if (comp_(data_[idx], data_[parent])) {
                std::swap(data_[idx], data_[parent]);
                idx = parent;
            } else {
                break;
            }
        }
    }

    void sift_down(size_t idx) {
        while (2 * idx + 1 < size_) {
            size_t left = 2 * idx + 1;
            size_t right = 2 * idx + 2;
            size_t smallest = idx;

            if (left < size_ && comp_(data_[left], data_[smallest])) {
                smallest = left;
            }
            if (right < size_ && comp_(data_[right], data_[smallest])) {
                smallest = right;
            }

            if (smallest != idx) {
                std::swap(data_[idx], data_[smallest]);
                idx = smallest;
            } else {
                break;
            }
        }
    }

    void resize() {
        size_t new_cap = capacity_ * 2;
        T* new_data = new T[new_cap];
        for (size_t i = 0; i < size_; ++i) new_data[i] = data_[i];
        delete[] data_;
        data_ = new_data;
        capacity_ = new_cap;
    }

public:
    explicit MyMinHeap(size_t initial_cap = 64) 
        : capacity_(initial_cap), size_(0), comp_(Compare()) {
        data_ = new T[capacity_];
    }

    ~MyMinHeap() { delete[] data_; }

    MyMinHeap(const MyMinHeap&) = delete;
    MyMinHeap& operator=(const MyMinHeap&) = delete;

    void push(const T& val) {
        if (size_ >= capacity_) resize();
        data_[size_] = val;
        sift_up(size_);
        size_++;
    }

    bool pop(T& out_val) {
        if (size_ == 0) return false;
        out_val = data_[0];
        data_[0] = data_[size_ - 1];
        size_--;
        if (size_ > 0) sift_down(0);
        return true;
    }

    bool peek(T& out_val) const {
        if (size_ == 0) return false;
        out_val = data_[0];
        return true;
    }

    size_t size() const { return size_; }
    bool is_empty() const { return size_ == 0; }
};

// 6. Custom Doubly Linked List (Active Lane Projectiles & Units for O(1) Removal)
template <typename T>
class DoublyLinkedList {
public:
    struct Node {
        T data;
        Node* prev;
        Node* next;
        Node(const T& val, Node* p = nullptr, Node* n = nullptr) 
            : data(val), prev(p), next(n) {}
    };

private:
    Node* head_;
    Node* tail_;
    size_t size_;

public:
    DoublyLinkedList() : head_(nullptr), tail_(nullptr), size_(0) {}
    ~DoublyLinkedList() { clear(); }

    DoublyLinkedList(const DoublyLinkedList&) = delete;
    DoublyLinkedList& operator=(const DoublyLinkedList&) = delete;

    Node* push_back(const T& val) {
        Node* node = new Node(val, tail_, nullptr);
        if (tail_) {
            tail_->next = node;
            tail_ = node;
        } else {
            head_ = tail_ = node;
        }
        size_++;
        return node;
    }

    Node* push_front(const T& val) {
        Node* node = new Node(val, nullptr, head_);
        if (head_) {
            head_->prev = node;
            head_ = node;
        } else {
            head_ = tail_ = node;
        }
        size_++;
        return node;
    }

    void remove(Node* node) {
        if (!node) return;
        if (node->prev) node->prev->next = node->next;
        else head_ = node->next;

        if (node->next) node->next->prev = node->prev;
        else tail_ = node->prev;

        delete node;
        size_--;
    }

    Node* head() const { return head_; }
    Node* tail() const { return tail_; }
    size_t size() const { return size_; }
    bool is_empty() const { return size_ == 0; }

    void clear() {
        Node* curr = head_;
        while (curr) {
            Node* next = curr->next;
            delete curr;
            curr = next;
        }
        head_ = tail_ = nullptr;
        size_ = 0;
    }
};
