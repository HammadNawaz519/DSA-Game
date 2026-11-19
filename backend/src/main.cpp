#include "storage/BinaryStorage.hpp"
#include "auth/AuthManager.hpp"
#include "game/RoomManager.hpp"
#include "network/HttpServer.hpp"
#include <iostream>
#include <cstdlib>
#include <csignal>

std::unique_ptr<Network::HttpServer> g_server = nullptr;

void signal_handler(int signum) {
    std::cout << "\n[SHUTDOWN] Received signal " << signum << ". Flushing binary files and exiting gracefully...\n";
    if (g_server) {
        g_server->stop();
    }
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

    // 4. Initialize Multiplayer Room & Single-Worker Action Queue
    Game::RoomManager room_mgr;

    // 5. Start HTTP & Network Server
    g_server = std::make_unique<Network::HttpServer>(port, auth, store, room_mgr);
    std::cout << "[READY] Server listening on http://0.0.0.0:" << port << "\n";
    
    g_server->start();

    return 0;
}
