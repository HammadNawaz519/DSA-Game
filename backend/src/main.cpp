#include "storage/BinaryStorage.hpp"
#include "auth/AuthManager.hpp"
#include "game/RoomManager.hpp"
#include "network/HttpServer.hpp"
#include "network/WebSocketServer.hpp"
#include <iostream>
#include <cstdlib>
#include <csignal>
#include <thread>
#include <atomic>
#include <chrono>

std::unique_ptr<Network::HttpServer> g_http_server = nullptr;
std::unique_ptr<Network::WebSocketServer> g_ws_server = nullptr;
std::atomic<bool> g_running{true};

void signal_handler(int signum) {
    std::cout << "\n[SHUTDOWN] Received signal " << signum << ". Flushing binary files...\n";
    g_running = false;
    if (g_http_server) g_http_server->stop();
    if (g_ws_server) g_ws_server->stop();
    std::cout << "[SHUTDOWN] Completed successfully.\n";
    std::exit(0);
}

int main(int argc, char* argv[]) {
    std::signal(SIGINT, signal_handler);
    std::signal(SIGTERM, signal_handler);

    std::cout << "========================================================\n";
    std::cout << "   PLANTS VS. ZOMBIES: TACTICAL WARFARE SERVER (C++17)  \n";
    std::cout << "========================================================\n";

    // 1. Determine Port from Environment or default to 8080
    int port = 8080;
    const char* env_port = std::getenv("PORT");
    if (env_port) {
        port = std::atoi(env_port);
    }

    // 2. Determine Data directory
    std::string data_dir = "./data";
    const char* env_data = std::getenv("DATA_DIR");
    if (env_data) {
        data_dir = env_data;
    }

    std::cout << "[STORAGE] Initializing Binary Storage at: " << data_dir << "\n";
    Storage::BinaryStore store(data_dir);

    // 3. Initialize Authentication Manager
    Security::AuthManager auth(store);

    // 4. Initialize Multiplayer Room & Action Queue
    Game::RoomManager room_mgr;

    // 5. Start HTTP Server (REST API)
    g_http_server = std::make_unique<Network::HttpServer>(port, auth, store, room_mgr);

    // 6. Start WebSocket Server (Real-time Game Sync)
    g_ws_server = std::make_unique<Network::WebSocketServer>(port + 1, auth, store, room_mgr);

    std::cout << "[READY] HTTP Server listening on http://0.0.0.0:" << port << "\n";
    std::cout << "[READY] WebSocket Server listening on ws://0.0.0.0:" << (port + 1) << "\n";

    // Start both servers
    g_http_server->start();
    g_ws_server->start();

    // Keep main thread alive
    while (g_running) {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }

    return 0;
}