#!/usr/bin/env python3
"""Auto-push code changes to GitHub via API."""
import sys, os, base64, requests

TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "zhouyouhulianwang/zenith-quiz-app"
BRANCH = "main"
HEADERS = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github.v3+json",
}

BASE_DIR = "/mnt/agents/output/app"

def get_file_sha(path):
    r = requests.get(
        f"https://api.github.com/repos/{REPO}/contents/{path}?ref={BRANCH}",
        headers=HEADERS, timeout=15,
    )
    if r.status_code == 200:
        return r.json().get("sha")
    return None

def update_file(path, message):
    full_path = os.path.join(BASE_DIR, path)
    if not os.path.exists(full_path):
        print(f"SKIP: {path} not found locally")
        return False
    with open(full_path, "r") as f:
        content = f.read()
    sha = get_file_sha(path)
    payload = {
        "message": message,
        "content": base64.b64encode(content.encode()).decode(),
        "branch": BRANCH,
    }
    if sha:
        payload["sha"] = sha
    r = requests.put(
        f"https://api.github.com/repos/{REPO}/contents/{path}",
        headers=HEADERS, json=payload, timeout=15,
    )
    if r.status_code in [200, 201]:
        commit = r.json().get("commit", {})
        print(f"  OK: {path} -> {commit.get('sha', 'N/A')[:8]}")
        return True
    else:
        print(f"  FAIL: {path} -> {r.status_code}: {r.text[:100]}")
        return False

def push_files(paths, message):
    print(f"Pushing to {REPO}/{BRANCH}: {message}")
    ok = 0
    for p in paths:
        if update_file(p, message):
            ok += 1
    print(f"Done: {ok}/{len(paths)} files pushed")
    return ok == len(paths)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: auto-push-github.py <commit-msg> <file1> [file2...]")
        sys.exit(1)
    msg = sys.argv[1]
    files = sys.argv[2:]
    push_files(files, msg)
