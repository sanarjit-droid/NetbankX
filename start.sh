#!/usr/bin/env sh
set -eu
if [ ! -d node_modules ]; then
  echo "Installing project dependencies…"
  npm install
fi
npm start
