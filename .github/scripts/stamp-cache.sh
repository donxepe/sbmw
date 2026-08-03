#!/usr/bin/env bash
# Stamp sw.js's CACHE with a hash of the app assets. Runs in the deploy job on the
# checkout that becomes the artifact — the committed sw.js is untouched.
# Deterministic per commit: the hash is taken over the pristine files, then sw.js is
# rewritten, so re-running on a fresh checkout of the same commit yields the same value.
set -euo pipefail

APP_FILES=(index.html sw.js manifest.webmanifest icon-192.png icon-512.png)
cache_re='s/^const CACHE = "\(.*\)";$/\1/p'

OLD="$(sed -n "$cache_re" sw.js)"
if [ -z "$OLD" ]; then
  echo 'FAIL no CACHE literal in sw.js (expected line 2: const CACHE = "...";)'
  echo '     stamping is how phones learn the app changed — refusing to deploy unstamped'
  exit 1
fi

HASH="$(cat "${APP_FILES[@]}" | sha256sum | cut -c1-8)"
sed -i "s/^const CACHE = \".*\";\$/const CACHE = \"minimalist-fb-${HASH}\";/" sw.js

NEW="$(sed -n "$cache_re" sw.js)"
if [ "$NEW" != "minimalist-fb-${HASH}" ]; then
  echo "FAIL rewrite did not take (sw.js still reads \"$NEW\")"
  exit 1
fi
echo "OK  CACHE $OLD -> $NEW"
