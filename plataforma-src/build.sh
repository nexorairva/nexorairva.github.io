#!/usr/bin/env sh
# Concatena src/* (orden por nombre) en ../plataforma/index.html
set -e
export LC_ALL=C
cd "$(dirname "$0")"
OUT=../plataforma/index.html
cat src/* > "$OUT"
sed -i '1i <!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><script src="config.js"></script></head><body>' "$OUT"
echo '</body></html>' >> "$OUT"
echo "OK -> plataforma/index.html"
