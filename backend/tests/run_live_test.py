import subprocess
import time
import urllib.request
import json
import os
import signal

import shutil
if os.path.exists("d:/DSA/backend/test_data_live"):
    shutil.rmtree("d:/DSA/backend/test_data_live", ignore_errors=True)

print("[TEST] Starting C++ server on port 8085...")
env = os.environ.copy()
env["PORT"] = "8085"
env["DATA_DIR"] = "d:/DSA/backend/test_data_live"

server_proc = subprocess.Popen(
    ["d:/DSA/backend/pvz_server.exe"],
    env=env,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

time.sleep(1.5)

try:
    # 1. Health check
    print("[TEST 1] Testing /health endpoint...")
    req = urllib.request.Request("http://127.0.0.1:8085/health")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode())
        print("  -> Health OK:", data)

    # 2. Register User
    print("[TEST 2] Testing User Registration (/api/auth/register)...")
    payload = json.dumps({"username": "CrazyDaveMaster", "password": "SuperSecretPassword123"}).encode()
    req = urllib.request.Request("http://127.0.0.1:8085/api/auth/register", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        assert data["success"] == True
        user_id = data["user_id"]
        print("  -> Registration OK! Created User ID:", user_id)

    # 3. Login
    print("[TEST 3] Testing User Login (/api/auth/login)...")
    payload = json.dumps({"username": "CrazyDaveMaster", "password": "SuperSecretPassword123"}).encode()
    req = urllib.request.Request("http://127.0.0.1:8085/api/auth/login", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        assert data["success"] == True
        token = data["token"]
        print("  -> Login OK! Received 64-char Token:", token[:16] + "...")

    # 4. Create Room
    print("[TEST 4] Testing Create Room (/api/rooms)...")
    payload = json.dumps({
        "name": "Garden Warfare PvP",
        "host_name": "CrazyDaveMaster",
        "host_id": user_id,
        "mode": 1
    }).encode()
    req = urllib.request.Request("http://127.0.0.1:8085/api/rooms", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        assert data["success"] == True
        room_id = data["room_id"]
        print("  -> Room Created OK! Room ID:", room_id)

    # 5. Join Room as Player 2
    print("[TEST 5] Testing Join Room (/api/rooms/join)...")
    payload = json.dumps({
        "room_id": room_id,
        "guest_name": "ZombieGeneral",
        "guest_id": 1002
    }).encode()
    req = urllib.request.Request("http://127.0.0.1:8085/api/rooms/join", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        assert data["success"] == True
        print("  -> Room Joined OK!")

    # 6. Place Plant action
    print("[TEST 6] Testing Place Plant Action (/api/game/action)...")
    payload = json.dumps({
        "room_id": room_id,
        "action": "PLACE_PLANT",
        "unit_type": 1,
        "row": 2,
        "col": 1,
        "cost": 100,
        "client_id": user_id
    }).encode()
    req = urllib.request.Request("http://127.0.0.1:8085/api/game/action", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        assert data["success"] == True
        print("  -> Plant placed successfully via Circular Queue single worker!")

    # 7. Check Game State
    print("[TEST 7] Testing Authoritative Simulation State (/api/game/state)...")
    req = urllib.request.Request(f"http://127.0.0.1:8085/api/game/state?room_id={room_id}")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print(f"  -> Authoritative Tick: {data['tick']}, Sun: {data['sun']}, Invaders: {len(data['invaders'])}, Projectiles: {len(data['projectiles'])}")

    # 8. Check Binary Files
    print("[TEST 8] Verifying Binary Persistence files on disk...")
    for fname in ["accounts.bin", "profiles.bin", "config.bin"]:
        p = os.path.join("d:/DSA/backend/test_data_live", fname)
        assert os.path.exists(p)
        print(f"  -> Found {fname} (Size: {os.path.getsize(p)} bytes)")

    print("\n[ALL 8 INTEGRATION TESTS PASSED SUCCESSFULLY!]")

finally:
    server_proc.terminate()
    try:
        server_proc.wait(timeout=2)
    except:
        server_proc.kill()
