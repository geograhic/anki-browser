#!/usr/bin/env python3
"""Set a GitHub Actions repository secret (encrypted via libsodium sealed box).

- Value to store: read from the KeePass vault via read_key.py --entry <entry-title>
- Auth for GitHub API: GH_AUTH env var (the GitHub PAT), never printed.
- Vault access: KDBX_PATH / KDBX_PASSWORD env vars (same as read_key.py), and
  READ_KEY_PY = path to read_key.py (defaults to "read_key.py" on PATH).

Usage: GH_AUTH=<gh-pat> READ_KEY_PY=<path-to-read_key.py> \
       python set-gh-secret.py <vault-entry-title> <SECRET_NAME>
"""
import base64
import json
import os
import shutil
import subprocess
import sys
import urllib.request

import nacl.bindings

OWNER = "geograhic"
REPO = "anki-browser"
READ_KEY = os.environ.get("READ_KEY_PY", "read_key.py")
PY = sys.executable


def main():
    if len(sys.argv) != 3:
        print(
            "usage: GH_AUTH=<gh-pat> READ_KEY_PY=<path-to-read_key.py> "
            "set-gh-secret.py <vault-entry-title> <SECRET_NAME>"
        )
        sys.exit(2)
    entry, secret_name = sys.argv[1], sys.argv[2]
    auth = os.environ.get("GH_AUTH", "").strip()
    if not auth:
        print("GH_AUTH env var (GitHub PAT) is required")
        sys.exit(2)
    if shutil.which(READ_KEY) is None and not os.path.exists(READ_KEY):
        print("read_key.py not found — set READ_KEY_PY to its path")
        sys.exit(2)

    # 1. Secret value from the vault (never printed)
    value = subprocess.check_output([PY, READ_KEY, "--entry", entry], text=True).strip()
    print(f"read vault entry '{entry}', value length {len(value)}")

    def api(method, path, body=None):
        headers = {
            "Authorization": f"Bearer {auth}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        data = json.dumps(body).encode() if body is not None else None
        if data:
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(
            f"https://api.github.com{path}", data=data, method=method, headers=headers
        )
        with urllib.request.urlopen(req) as r:
            return r.status, json.load(r)

    # 2. GitHub repo public key
    status, key_data = api("GET", f"/repos/{OWNER}/{REPO}/actions/secrets/public-key")
    key_id = key_data["key_id"]
    pub = base64.b64decode(key_data["key"])

    # 3. Encrypt with libsodium crypto_box_seal (GitHub's documented primitive)
    sealed = nacl.bindings.crypto_box_seal(value.encode("utf-8"), pub)
    encrypted = base64.b64encode(sealed).decode("ascii")

    # 4. PUT the secret
    status, _ = api(
        "PUT",
        f"/repos/{OWNER}/{REPO}/actions/secrets/{secret_name}",
        {"encrypted_value": encrypted, "key_id": key_id},
    )
    print(f"secret '{secret_name}' set, HTTP {status}")


if __name__ == "__main__":
    main()
