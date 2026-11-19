cmake_minimum_required(VERSION 3.16)
project(pvz_tactical_warfare_server CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(include)

file(GLOB_RECURSE SOURCES "src/*.cpp")

add_executable(pvz_server ${SOURCES})

if (WIN32)
    target_link_libraries(pvz_server ws2_32)
else()
    target_link_libraries(pvz_server pthread)
endif()
