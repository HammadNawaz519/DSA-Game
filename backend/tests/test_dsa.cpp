#include "dsa/CoreStructures.hpp"
#include "dsa/SortingAndHeap.hpp"
#include "dsa/TreesAndHash.hpp"
#include "dsa/AdvancedDSA.hpp"
#include "storage/BinaryContracts.hpp"
#include "storage/BinaryStorage.hpp"
#include <iostream>
#include <cassert>

int main() {
    std::cout << "Testing 15 DSA implementations...\n";

    // 1. Grid2D
    Grid2D<int> grid(5, 9, 0);
    grid.at(2, 4) = 42;
    assert(grid.at(2, 4) == 42);

    // 2. Stack
    MyStack<int> st;
    st.push(10);
    st.push(20);
    int top_val;
    assert(st.pop(top_val) && top_val == 20);

    // 3. CircularQueue
    CircularQueue<int, 4> cq;
    assert(cq.enqueue(1) && cq.enqueue(2));
    int q_val;
    assert(cq.dequeue(q_val) && q_val == 1);

    // 4. Sorting
    int arr[] = {5, 2, 8, 1, 9};
    MySort::merge_sort(arr, 0, 4);
    assert(arr[0] == 1 && arr[4] == 9);

    // 5. MinHeap
    MyMinHeap<int> heap;
    heap.push(50);
    heap.push(10);
    heap.push(30);
    int min_val;
    assert(heap.pop(min_val) && min_val == 10);

    // 6. DoublyLinkedList
    DoublyLinkedList<int> dll;
    auto node = dll.push_back(100);
    dll.push_back(200);
    dll.remove(node);
    assert(dll.head()->data == 200);

    // 7. AlmanacTree
    AlmanacTree tree;
    tree.insert(2, "UnitBeta", "Flora");
    tree.insert(1, "UnitAlpha", "Flora");
    std::vector<std::string> trav;
    tree.in_order(tree.root, trav);
    assert(trav.size() == 2);

    // 8. RoomBST
    RoomBST<int> bst;
    bst.insert("RoomLawn42", 101);
    int r_id;
    assert(bst.search("RoomLawn42", r_id) && r_id == 101);

    // 9. AVLTree
    AVLTree<int, std::string> avl;
    avl.insert(1200, "Alice");
    avl.insert(1500, "Bob");
    avl.insert(1100, "Charlie");
    auto sorted = avl.get_sorted_records();
    assert(sorted[0].first == 1500); // Descending for leaderboard

    // 10. HashTable
    CustomHashTable<std::string, int> ht;
    ht.insert("player_dave", 999);
    int p_val;
    assert(ht.get("player_dave", p_val) && p_val == 999);

    // 11. BFS
    auto splash = GridBFS::compute_splash(2, 4, 1);
    assert(!splash.empty());

    // 12. DFS
    bool test_grid[5][9] = {false};
    test_grid[2][2] = true;
    test_grid[2][3] = true;
    std::vector<GridPos> det;
    ChainReactorDFS::trigger_chain(2, 2, test_grid, det);
    assert(det.size() == 2);

    // 13. Huffman
    std::string comp = HuffmanEncoder::compress("PVZ_MULTIPLAYER_REPLAY_TEST");
    assert(!comp.empty());

    // 14. BloomFilter
    BloomFilter bf;
    bf.add("banned_badword");
    assert(bf.possibly_contains("banned_badword"));
    assert(!bf.possibly_contains("clean_player_name"));

    // 15. SkipList
    SkipList<int, std::string> sl;
    sl.insert(100, "TickEventAt100ms");
    std::string s_val;
    assert(sl.search(100, s_val) && s_val == "TickEventAt100ms");

    // BinaryStore test
    Storage::BinaryStore store("./test_data");
    ConfigRecord cfg;
    assert(store.load_config(cfg));
    assert(cfg.action_rate_limit_x == 15);

    std::cout << "[SUCCESS] ALL 15 DSA IMPLEMENTATIONS & BINARY STORAGE PASSED!\n";
    return 0;
}
