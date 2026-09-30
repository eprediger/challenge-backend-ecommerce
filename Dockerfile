FROM node:22-slim

# sqlite3 CLI: seed is database/seed.sql applied via
# `docker compose exec app sqlite3 ...` (psql lives in the postgres service).
RUN apt-get update \
 && apt-get install -y --no-install-recommends sqlite3 \
 && rm -rf /var/lib/apt/lists/*
