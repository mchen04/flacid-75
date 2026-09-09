#!/usr/bin/env bash
set -euo pipefail
repo_dir="$(cd "$(dirname "$0")/../.." && pwd)"
source_dir="$(mktemp -d "${TMPDIR:-/tmp}/flaccid75-privacy.XXXXXX")"
trap 'rm -rf "$source_dir"' EXIT
mkdir -p "$source_dir/scripts/privacy"
cp "$repo_dir/package.json" "$repo_dir/package-lock.json" "$source_dir/"
cp -R "$repo_dir/lib" "$source_dir/lib"
cp "$repo_dir/scripts/photo-audit.ts" "$source_dir/scripts/"
cp "$repo_dir/scripts/privacy/trace.mjs" "$source_dir/scripts/privacy/"
docker run --rm --name flaccid75-photo-trace \
  --env-file "$repo_dir/.env.local" \
  --tmpfs /tmp:exec,size=2147483648 --tmpfs /root:size=67108864 \
  --tmpfs /var/lib/apt/lists:size=268435456 --tmpfs /var/cache/apt:size=67108864 \
  --tmpfs /etc/ssl/certs:size=16777216 \
  --mount "type=bind,source=$source_dir,target=/src,readonly" \
  --mount "type=bind,source=$repo_dir/evidence,target=/out" \
  node:24-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e \
  bash -euc '
    apt-get update -qq
    mkdir /tmp/packages /tmp/tools /tmp/app
    cd /tmp/packages
    apt-get download strace libunwind8 ca-certificates
    for package in *.deb; do dpkg-deb -x "$package" /tmp/tools; done
    cat /tmp/tools/usr/share/ca-certificates/mozilla/*.crt > /etc/ssl/certs/ca-certificates.crt
    export LD_LIBRARY_PATH="$(find /tmp/tools/usr/lib -name libunwind.so.8 -printf "%h")"
    cp -R /src/. /tmp/app/
    cd /tmp/app
    npm ci --cache /tmp/npm-cache --no-audit --no-fund
    node scripts/privacy/trace.mjs
  '
