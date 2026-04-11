#!/usr/bin/env bash
#
# Reset the local development database.
#
set -euo pipefail

printf "This will delete the local database. Continue? [y/N] "
read -r answer
case "$answer" in
  [yY]) ;;
  *) echo "Aborted."; exit 0 ;;
esac

rm -f ./data/db.sqlite ./data/db.sqlite-shm ./data/db.sqlite-wal
echo "Database reset complete."
