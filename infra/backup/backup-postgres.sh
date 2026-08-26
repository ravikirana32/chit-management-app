#!/bin/sh
set -eu
: "${POSTGRES_HOST:?}"
: "${POSTGRES_DB:?}"
: "${POSTGRES_USER:?}"
: "${BACKUP_DIR:?}"
mkdir -p "$BACKUP_DIR"
pg_dump --host="$POSTGRES_HOST" --username="$POSTGRES_USER" --format=custom "$POSTGRES_DB" > "$BACKUP_DIR/chit-$(date +%Y%m%d-%H%M%S).dump"
find "$BACKUP_DIR" -type f -name '*.dump' -mtime +30 -delete
