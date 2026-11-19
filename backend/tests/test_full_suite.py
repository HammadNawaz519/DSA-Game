import subprocess
import time
import urllib.request
import json
import os
import shutil

print("=================================================================")
print("   PLANTS VS. ZOMBIES: COMPREHENSIVE AUTOMATED TEST SUITE        ")
print("=================================================================")

test_dir = "d:/DSA/backend/test_data_suite"
if os.path.exists(test_dir):
    shutil.rmtree(test_dir, ignore_errors=True)

env = os.environ.copy()
env["PORT"] = "8090"
env["DATA_DIR"] = test_dir

print("\n[PHASE 1] Starting C++ Authoritative Server on port 8090...")
server = subprocess.Popen(["d:/DSA/backend/pvz_server.exe"], env=env)
time.sleep(1.5)

try:
    # 1. Health
    print("[TEST 1] Verifying server health...")
    with urllib.request.urlopen("http://127.0.0.1:8090/health") as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode())
        print("  -> Health OK:", data["server"])

    # 2. Register Player 1
    print("[TEST 2] Registering Player 1...")
    p1_data = json.dumps({"username": "CommanderLeaf", "password": "LeafPassword123"}).encode()
    req = urllib.request.Request("http://127.0.0.1:8090/api/auth/register", data=p1_data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        assert data["success"] == True
        p1_id = data["user_id"]
        print("  -> Player 1 Registered: ID", p1_id)

    # 3. Register Player 2
    print("[TEST 3] Registering Player 2...")
    p2_data = json.dumps({"username": "GeneralGhoul", "password": "GhoulPassword123"}).encode()
    req = urllib.request.Request("http://127.0.0.1:8090/api/auth/register", data=p2_data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        assert data["success"] == True
        p2_id = data["user_id"]
        print("  -> Player 2 Registered: ID", p2_id)

    # 4. Login Player 1
    print("[TEST 4] Authenticating Player 1...")
    req = urllib.request.Request("http://127.0.0.1:8090/api/auth/login", data=p1_data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        assert data["success"] == True
        token = data["token"]
        print("  -> Player 1 Authenticated! Token:", token[:12] + "...")

    # 5. 8 Ball Pool Style Matchmaking
    print("[TEST 5] Testing 1v1 Ranked Matchmaking Queue...")
    q1 = json.dumps({"user_id": p1_id, "username": "CommanderLeaf", "elo": 1000, "mode": 1}).encode()
    urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8090/api/matchmaking/queue", data=q1, headers={"Content-Type": "application/json"}))

    q2 = json.dumps({"user_id": p2_id, "username": "GeneralGhoul", "elo": 1000, "mode": 1}).encode()
    urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8090/api/matchmaking/queue", data=q2, headers={"Content-Type": "application/json"}))

    time.sleep(1.2) # Allow matchmaker thread to pair them

    with urllib.request.urlopen(f"http://127.0.0.1:8090/api/matchmaking/status?user_id={p1_id}") as resp:
        data = json.loads(resp.read().decode())
        assert data["matched"] == True
        matched_room_id = data["room_id"]
        print(f"  -> Matchmaking Successful! Room: {matched_room_id}, Opponent: {data['opponent']}, Role: {data['role']}")

    # 6. Private Room with 6-Character Code
    print("[TEST 6] Testing Private Room Creation with Code...")
    pr_data = json.dumps({"host_id": p1_id, "host_name": "CommanderLeaf", "host_elo": 1000, "mode": 1}).encode()
    with urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8090/api/rooms/private", data=pr_data, headers={"Content-Type": "application/json"})) as resp:
        data = json.loads(resp.read().decode())
        assert data["success"] == True
        room_code = data["code"]
        pr_room_id = data["room_id"]
        print(f"  -> Private Room Created! Code: {room_code}, ID: {pr_room_id}")

    # 7. Join Private Room using Code
    print("[TEST 7] Player 2 Joining Private Room via Code...")
    join_data = json.dumps({"code": room_code, "guest_id": p2_id, "guest_name": "GeneralGhoul", "guest_elo": 1000}).encode()
    with urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8090/api/rooms/join-code", data=join_data, headers={"Content-Type": "application/json"})) as resp:
        data = json.loads(resp.read().decode())
        assert data["success"] == True
        print("  -> Joined Private Room successfully!")

    # 8. Pre-Game Ready & Start Match
    print("[TEST 8] Pre-game Ready & Start...")
    ready_data = json.dumps({"room_id": pr_room_id, "user_id": p2_id, "ready": True}).encode()
    urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8090/api/rooms/ready", data=ready_data, headers={"Content-Type": "application/json"}))

    start_data = json.dumps({"room_id": pr_room_id, "host_id": p1_id}).encode()
    with urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8090/api/rooms/start", data=start_data, headers={"Content-Type": "application/json"})) as resp:
        data = json.loads(resp.read().decode())
        assert data["success"] == True
        print("  -> Private Match Started!")

    # 9. Practice AI Mode
    print("[TEST 9] Testing Practice vs AI Mode...")
    ai_data = json.dumps({"user_id": p1_id, "username": "CommanderLeaf", "elo": 1000}).encode()
    with urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8090/api/rooms/practice-ai", data=ai_data, headers={"Content-Type": "application/json"})) as resp:
        data = json.loads(resp.read().decode())
        assert data["success"] == True
        print("  -> AI Practice Lawn Provisioned:", data["room_id"])

    # 10. Idempotent Demo Data Seeding
    print("[TEST 10] Testing Demo Data Seeding (/api/admin/seed-demo)...")
    with urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8090/api/admin/seed-demo", data=b"{}", headers={"Content-Type": "application/json"})) as resp:
        data = json.loads(resp.read().decode())
        assert data["success"] == True
        print(f"  -> Seeded {data['seeded_count']} realistic demo accounts!")

    # Second seed run should be idempotent (0 new accounts)
    with urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8090/api/admin/seed-demo", data=b"{}", headers={"Content-Type": "application/json"})) as resp:
        data = json.loads(resp.read().decode())
        assert data["seeded_count"] == 0
        print("  -> Idempotency Verified! (0 duplicate accounts created)")

    # 11. 30-Client Concurrency Load Test
    print("[TEST 11] Running 30-Client Concurrency Simulation...")
    with urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8090/api/admin/load-test", data=b"{}", headers={"Content-Type": "application/json"})) as resp:
        data = json.loads(resp.read().decode())
        assert data["enqueued_actions"] == 30
        print(f"  -> Enqueued and processed 30 actions sequentially via Circular Queue!")

    # 12. Check Binary File Persistence on Disk
    print("[TEST 12] Verifying Binary Persistence files on disk...")
    for f in ["accounts.bin", "profiles.bin", "config.bin"]:
        p = os.path.join(test_dir, f)
        assert os.path.exists(p)
        print(f"  -> {f}: {os.path.getsize(p)} bytes")

    print("\n[SUCCESS] ALL 12 END-TO-END SYSTEM TESTS PASSED PERFECTLY!\n")

finally:
    server.terminate()
    try:
        server.wait(timeout=2)
    except:
        server.kill()

    # Clean up test directory
    shutil.rmtree(test_dir, ignore_errors=True)
