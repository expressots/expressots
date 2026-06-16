#!/usr/bin/env bash
# Scaffold a v4 example from the monorepo templates.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATES="$ROOT/../templates"
PREVIEW="4.0.0-preview.3.4"

copy_application_base() {
  local dir="$1"
  local name="$2"
  local desc="$3"

  mkdir -p "$dir"
  for f in tsconfig.json tsconfig.build.json jest.config.ts expressots.config.ts eslint.config.mjs .gitignore; do
    cp "$TEMPLATES/application/$f" "$dir/$f"
  done
  sed -i 's/"types": \["node", "jest"\]/"types": ["node"]/' "$dir/tsconfig.json"

  cat > "$dir/package.json" <<EOF
{
    "name": "${name}",
    "version": "1.0.0",
    "description": "${desc}",
    "private": true,
    "license": "MIT",
    "main": "dist/src/main.js",
    "scripts": {
        "dev": "expressots dev",
        "build": "expressots build",
        "prod": "expressots prod",
        "test": "jest --runInBand",
        "test:watch": "jest --watchAll",
        "test:cov": "jest --coverage",
        "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
        "lint": "eslint \"src/**/*.ts\" \"test/**/*.ts\" --fix"
    },
    "dependencies": {
        "@expressots/adapter-express": "${PREVIEW}",
        "@expressots/core": "${PREVIEW}",
        "@expressots/shared": "${PREVIEW}",
        "express": "5.2.1"
    },
    "devDependencies": {
        "@eslint/js": "9.39.2",
        "@expressots/cli": "${PREVIEW}",
        "@types/express": "5.0.6",
        "@types/jest": "30.0.0",
        "@types/node": "25.0.3",
        "@typescript-eslint/eslint-plugin": "8.61.0",
        "@typescript-eslint/parser": "8.61.0",
        "eslint": "9.39.2",
        "jest": "30.0.0",
        "prettier": "3.7.4",
        "ts-jest": "29.4.6",
        "tsx": "4.21.0",
        "typescript": "5.9.3",
        "typescript-eslint": "8.61.0"
    },
    "allowScripts": {
        "esbuild": true,
        "unrs-resolver": true
    }
}
EOF
}

copy_micro_base() {
  local dir="$1"
  local name="$2"
  local desc="$3"

  mkdir -p "$dir"
  for f in tsconfig.json tsconfig.build.json jest.config.ts expressots.config.ts eslint.config.mjs .gitignore; do
    cp "$TEMPLATES/micro/$f" "$dir/$f"
  done

  cat > "$dir/package.json" <<EOF
{
    "name": "${name}",
    "version": "1.0.0",
    "description": "${desc}",
    "private": true,
    "license": "MIT",
    "main": "dist/src/api.js",
    "scripts": {
        "dev": "expressots dev",
        "build": "expressots build",
        "prod": "expressots prod",
        "test": "jest --runInBand"
    },
    "dependencies": {
        "@expressots/adapter-express": "${PREVIEW}",
        "@expressots/core": "${PREVIEW}",
        "@expressots/shared": "${PREVIEW}"
    },
    "devDependencies": {
        "@expressots/cli": "${PREVIEW}",
        "@types/jest": "30.0.0",
        "@types/node": "25.0.3",
        "jest": "30.0.0",
        "ts-jest": "29.4.6",
        "tsx": "4.21.0",
        "typescript": "5.9.3"
    }
}
EOF
}

write_main() {
  local dir="$1"
  mkdir -p "$dir/src"
  cp "$TEMPLATES/application/src/main.ts" "$dir/src/main.ts"
}

write_env_example() {
  local dir="$1"
  local extra="${2:-}"
  cat > "$dir/.env.example" <<EOF
APP_NAME=expressots-example
PORT=3000
NODE_ENV=development
LOG_LEVEL=INFO
${extra}
EOF
}

# Application-based examples
copy_application_base "$ROOT/01-starter-api" "expressots-starter-api" "Minimal ExpressoTS v4 REST API starter"
write_main "$ROOT/01-starter-api"
write_env_example "$ROOT/01-starter-api"

copy_application_base "$ROOT/02-jwt-authentication" "expressots-jwt-authentication" "JWT authentication with AuthProvider and guards"
write_main "$ROOT/02-jwt-authentication"
write_env_example "$ROOT/02-jwt-authentication" "JWT_SECRET=dev-secret-change-me-min-32-chars-long"

copy_application_base "$ROOT/03-authorization-rbac" "expressots-authorization-rbac" "Role and permission based authorization"
write_main "$ROOT/03-authorization-rbac"
write_env_example "$ROOT/03-authorization-rbac" "JWT_SECRET=dev-secret-change-me-min-32-chars-long"

copy_application_base "$ROOT/04-database-inmemory" "expressots-database-inmemory" "InMemoryDBProvider repository pattern"
write_main "$ROOT/04-database-inmemory"
write_env_example "$ROOT/04-database-inmemory"

copy_application_base "$ROOT/05-database-postgres" "expressots-database-postgres" "PostgreSQL provider with IBootstrap lifecycle"
write_main "$ROOT/05-database-postgres"
write_env_example "$ROOT/05-database-postgres" "DB_HOST=localhost\nDB_PORT=5432\nDB_NAME=expressots\nDB_USER=postgres\nDB_PASSWORD=postgres"

copy_application_base "$ROOT/06-database-prisma" "expressots-database-prisma" "Prisma ORM integration"
write_main "$ROOT/06-database-prisma"
write_env_example "$ROOT/06-database-prisma" "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/expressots"

copy_application_base "$ROOT/07-file-upload" "expressots-file-upload" "File uploads with @FileUpload decorator"
write_main "$ROOT/07-file-upload"
write_env_example "$ROOT/07-file-upload"

copy_application_base "$ROOT/08-events" "expressots-events" "Type-safe event system"
write_main "$ROOT/08-events"
write_env_example "$ROOT/08-events"

copy_application_base "$ROOT/09-message-queue" "expressots-message-queue" "BullMQ message queue provider"
write_main "$ROOT/09-message-queue"
write_env_example "$ROOT/09-message-queue" "REDIS_URL=redis://localhost:6379"

copy_application_base "$ROOT/10-redis-cache" "expressots-redis-cache" "Redis cache provider with health checks"
write_main "$ROOT/10-redis-cache"
write_env_example "$ROOT/10-redis-cache" "REDIS_URL=redis://localhost:6379"

copy_application_base "$ROOT/11-testing" "expressots-testing" "Unit, integration, and load testing patterns"
write_main "$ROOT/11-testing"
write_env_example "$ROOT/11-testing"

copy_application_base "$ROOT/12-docker-compose" "expressots-docker-compose" "Docker Compose multi-service development"
write_main "$ROOT/12-docker-compose"
write_env_example "$ROOT/12-docker-compose" "DB_HOST=postgres\nDB_PORT=5432\nDB_NAME=expressots\nDB_USER=postgres\nDB_PASSWORD=postgres\nREDIS_URL=redis://redis:6379"

copy_micro_base "$ROOT/13-micro-api" "expressots-micro-api" "Micro API lightweight services"
write_env_example "$ROOT/13-micro-api"

copy_application_base "$ROOT/14-interceptors" "expressots-interceptors" "AOP interceptors for cross-cutting concerns"
write_main "$ROOT/14-interceptors"
write_env_example "$ROOT/14-interceptors"

copy_application_base "$ROOT/15-openapi-studio" "expressots-openapi-studio" "OpenAPI generation and Studio workflow"
write_main "$ROOT/15-openapi-studio"
write_env_example "$ROOT/15-openapi-studio"

echo "Scaffold complete."
