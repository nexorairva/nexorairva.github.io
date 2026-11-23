#!/usr/bin/env sh
# Concatena src/* (orden por nombre) en public/index.html
set -e
export LC_ALL=C
cd "$(dirname "$0")"
cat src/* > public/index.html
sed -i '1i <!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><script src="config.js"></script></head><body>' public/index.html
echo '</body></html>' >> public/index.html
echo "OK -> public/index.html"
