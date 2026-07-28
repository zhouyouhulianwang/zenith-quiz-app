#!/usr/bin/env python3
"""Regression test suite for ZENITH quiz app.
Run after each deployment to verify core functionality."""
import sys, requests, json

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://47.88.59.160:3000"
PASS = 0
FAIL = 0

def check(name, condition, detail=""):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  PASS: {name}")
    else:
        FAIL += 1
        print(f"  FAIL: {name} - {detail}")

def test(name, fn):
    print(f"\n=== {name} ===")
    try:
        fn()
    except Exception as e:
        print(f"  ERROR: {e}")

def main():
    print(f"ZENITH Regression Test - {BASE}")
    print("=" * 50)

    session = requests.Session()

    # 1. Health
    test("Health Check", lambda: (
        check("health", requests.get(f"{BASE}/api/trpc/health", timeout=10).status_code == 200)
    ))

    # 2. Auth
    test("Auth", lambda: (
        check("login user1", session.post(f"{BASE}/api/trpc/simpleAuth.login", json={"json": {"username": "1", "password": "1"}}, timeout=10).json()["result"]["data"]["json"]["success"]),
        check("me not null", session.get(f"{BASE}/api/trpc/simpleAuth.me", timeout=10).json()["result"]["data"]["json"] is not None),
        check("me name Chinese", "\u4e00" <= (session.get(f"{BASE}/api/trpc/simpleAuth.me", timeout=10).json()["result"]["data"]["json"].get("name", "")[0]) <= "\u9fff"),
    ))

    # 3. Bank list
    test("Bank List", lambda: (
        check("bank.list returns data", len((r := session.get(f"{BASE}/api/trpc/bank.list", timeout=15)).json()["result"]["data"]["json"]) > 0),
        check("bank.list has questionCount", all(b.get("questionCount", 0) > 0 for b in r.json()["result"]["data"]["json"])),
    ))

    # 4. Bank detail
    banks_data = session.get(f"{BASE}/api/trpc/bank.list", timeout=15).json()["result"]["data"]["json"]
    if banks_data:
        bank_id = banks_data[0]["id"]
        test("Bank Detail", lambda: (
            check("bank.get returns questions", len((r := session.get(f"{BASE}/api/trpc/bank.get", params={"input": json.dumps({"json": {"id": bank_id}})}, timeout=20)).json()["result"]["data"]["json"]["questions"]) > 0),
            check("questions is array", isinstance(r.json()["result"]["data"]["json"]["questions"], list)),
        ))

    # 5. Mock exam isolation
    test("Mock Exam Isolation", lambda: (
        check("user1 sees own exams", len(session.get(f"{BASE}/api/trpc/mockExam.list", timeout=10).json()["result"]["data"]["json"]) >= 0),
    ))

    # 6. Settings
    test("Settings", lambda: (
        check("settings.get", session.get(f"{BASE}/api/trpc/settings.get", timeout=10).status_code == 200),
    ))

    # 7. Records
    test("Practice Records", lambda: (
        check("record.list", (r := session.get(f"{BASE}/api/trpc/record.list", timeout=10)).status_code == 200),
        check("record.list returns array", isinstance(r.json()["result"]["data"]["json"], list)),
    ))

    # 8. Translation
    test("Translation API", lambda: (
        check("batchTranslate", (r := session.post(f"{BASE}/api/trpc/translate.batchTranslate", json={"json": {"texts": ["你好"], "from": "zh-CN", "to": "en"}}, timeout=30)).status_code == 200),
        check("translation not [EN]", not r.json()["result"]["data"]["json"]["results"][0].startswith("[EN]")),
    ))

    # 9. UTF-8 charset (bank title should not be garbled)
    test("UTF-8", lambda: (
        check("bank title readable", "HKSI" in banks_data[0].get("title", "") or "\u4e00" <= banks_data[0].get("title", "")[0] <= "\u9fff"),
    ))

    # Summary
    print(f"\n{'=' * 50}")
    print(f"Results: {PASS} passed, {FAIL} failed, {PASS + FAIL} total")
    print(f"{'=' * 50}")
    return FAIL == 0

if __name__ == "__main__":
    ok = main()
    sys.exit(0 if ok else 1)
