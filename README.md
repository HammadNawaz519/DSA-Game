# Plants vs. Zombies: Tactical Warfare

A real-time multiplayer 3D strategy game built for the DSA final project. Features an authoritative C++17 game engine, pure binary file persistence (no SQL/NoSQL databases), a Three.js / React 3D frontend, 15 custom DSA implementations, ELO matchmaking, and private match lobbies.

---

## Quick Start (Single-Command Runner)

You can launch both the **C++ Authoritative Server** (port 8080) and the **Vite 3D Frontend Client** (port 5173) with a single command:

### On Windows (CMD / Double-Click)
```cmd
run_game.bat
```
*(Or simply double-click `run_game.bat` in Windows Explorer)*

### On Windows (PowerShell)
```powershell
.\run_game.ps1
```

The script will automatically:
1. Verify and compile the C++ server binary using GCC/G++ (`-std=c++17 -static`) if not already compiled.
2. Install any missing frontend npm dependencies.
3. Start the C++ authoritative backend server listening on `http://localhost:8080`.
4. Launch the Vite 3D frontend development server at `http://localhost:5173`.
5. Open your default web browser to the game automatically.

---

## System Architecture

```
                       ┌──────────────────────────────────────────────┐
                       │          React / Three.js Frontend           │
                       │           (Vercel Cloud / Local)             │
                       └──────────────────────┬───────────────────────┘
                                              │ HTTP REST (20Hz Tick)
                                              ▼
                       ┌──────────────────────────────────────────────┐
                       │        C++17 Authoritative Server            │
                       │           (Render Cloud / Local)             │
                       │   - ELO Matchmaking Thread                   │
                       │   - CircularQueue Action Worker Thread       │
                       │   - 20Hz Game Loop Simulation                │
                       └──────────────────────┬───────────────────────┘
                                              │ Direct std::fstream
                                              ▼
                       ┌──────────────────────────────────────────────┐
                       │           Pure Binary Storage                │
                       │    accounts.bin, profiles.bin, config.bin    │
                       └──────────────────────────────────────────────┘
```

### 1. C++17 Authoritative Backend (`/backend`)
* **Standard**: C++17, cross-platform (Windows WinSock2 `ws2_32` and Linux POSIX sockets).
* **Game Engine**: 20 Hz simulation tick rate. Client inputs are sent as validated actions; the server simulates zombie movement, projectile ballistics, collision detection, and plant activations.
* **Concurrency**: Thread-safe single-worker consumer queue (`CircularQueue`) for all state mutations.
* **Cloud Deployment**: Containerized with multi-stage `Dockerfile` (GCC 12 -> Debian Slim) ready for Render.

### 2. Pure Binary File Persistence (`/backend/include/storage/`)
* **Zero Database Engines**: Built entirely with raw `std::fstream` binary file operations.
* **Exact Byte Packing**: Header magic bytes (`PVZA`, `PVZP`, `PVZS`, `PVZC`), fixed-width records, and $O(1)$ arithmetic file seek offsets:
  * `accounts.bin`: 128-byte packed records (User ID, salt, hash, display name, flags)
  * `profiles.bin`: 128-byte packed records (ELO rating, matches, win/loss stats)
  * `config.bin`: 48-byte packed record (8 live-tunable gameplay parameters)

### 3. Studio-Quality 3D Frontend (`/frontend`)
* **Vite + React 18 + Three.js**.
* **Live 3D Lobby**: Interactive 3D garden environment behind the main menu featuring animated 3D plants (Peashooter, Sunflower, Wall-nut, Snow Pea, Repeater), atmospheric lighting, and subtle camera motion.
* **3D Lawn Battlefield**: Isometric 5x9 tile grid, raycast unit placement, zombie horde rendering, ballistic projectile arcs, and lawnmower cart triggers.
* **Game Modes**:
  * **Play Online**: Ranked 1v1 ELO matchmaking queue with animated VS radar screen.
  * **Play With Friend**: Private room generation with 6-character duel codes.
  * **Practice vs AI**: Solo defensive training against server-generated zombie waves.
  * **Co-op Survival**: 2-Player alliance room lobby.
* **Panels**: Global Leaderboard (AVL tree), Garden Almanac (multi-order tree traversal), Career Profile (skip-list history), and Mission Control (live config modifier).

---

## 15 Mandatory Custom DSA Implementations

| # | Data Structure / Algorithm | File Location | Purpose in Game |
|---|----------------------------|---------------|-----------------|
| 1 | `Grid2D<T>` | `include/dsa/CoreStructures.hpp` | 5x9 2D lawn matrix representation |
| 2 | `MyStack<T>` | `include/dsa/CoreStructures.hpp` | 3-second action undo history |
| 3 | `CircularQueue<T, Cap>` | `include/dsa/CoreStructures.hpp` | Mutex-guarded action queue (30-client buffer) |
| 4 | `DoublyLinkedList<T>` | `include/dsa/SortingAndHeap.hpp` | Active zombie lane entities per row |
| 5 | `MyMinHeap<T>` | `include/dsa/SortingAndHeap.hpp` | Priority-based nearest zombie targeting |
| 6 | `MySort::merge_sort` | `include/dsa/SortingAndHeap.hpp` | Stable sorting of player match histories |
| 7 | `MySort::quick_sort` | `include/dsa/SortingAndHeap.hpp` | In-place ELO ranking calculation |
| 8 | `AlmanacTree` (BST) | `include/dsa/TreesAndHash.hpp` | 4 traversals (Pre, In, Post, Level-order BFS) |
| 9 | `RoomBST<T>` | `include/dsa/TreesAndHash.hpp` | $O(\log n)$ active room code lookup |
| 10 | `AVLTree<Key, Value>` | `include/dsa/TreesAndHash.hpp` | Self-balancing dynamic global leaderboard |
| 11 | `CustomHashTable<K, V>` | `include/dsa/TreesAndHash.hpp` | Active sessions with quadratic probing |
| 12 | `GridBFS::compute_splash` | `include/dsa/AdvancedDSA.hpp` | 3x3 Cherry Bomb explosion radius expansion |
| 13 | `ChainReactorDFS` | `include/dsa/AdvancedDSA.hpp` | Jalapeno lane propagation & chain reactions |
| 14 | `BloomFilter` | `include/dsa/AdvancedDSA.hpp` | 3-hash bitset duplicate username filter |
| 15 | `SkipList<Key, Value>` | `include/dsa/AdvancedDSA.hpp` | Probabilistic multi-level match history index |

---

## Manual Build Instructions

### Compile Backend Server
```powershell
# Windows (MinGW / UCRT64 GCC)
g++ -std=c++17 -static -static-libgcc -static-libstdc++ -I backend/include backend/src/main.cpp -o backend/pvz_server.exe -lws2_32

# Linux
g++ -std=c++17 -I backend/include backend/src/main.cpp -o backend/pvz_server -lpthread
```

### Run Unit Tests
```powershell
g++ -std=c++17 -static -static-libgcc -static-libstdc++ -I backend/include backend/tests/test_dsa.cpp -o backend/tests/test_dsa.exe
.\backend\tests\test_dsa.exe
```

### Run 12-Phase End-to-End Test Suite
```powershell
python backend/tests/test_full_suite.py
```

### Build Frontend
```powershell
cd frontend
npm install
npm run build
```

---

## Cloud Deployment

* **Frontend**: Deploy `/frontend` to **Vercel** (`vercel.json` included with SPA fallback routing). Set `VITE_BACKEND_URL` environment variable to your Render backend URL.
* **Backend**: Deploy `/backend` to **Render** using Docker (`backend/Dockerfile`). Mount a persistent disk at `/app/data` to preserve binary save files across restarts.
