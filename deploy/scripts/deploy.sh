#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Nihonnuta 自动部署脚本
# 由 webhook-server.py 触发
#
# 服务器目录结构：
#   /root/service-online/nihonnuta/
#   ├── deploy/              ← 部署配置（docker-compose, .env, init.sql）
#   ├── nihonnuta-backend/   ← 后端仓库
#   ├── nihonnuta-uniapp/    ← 前端仓库
#   └── netease-api/         ← 网易云 API
#
# 流程：git pull 各仓库 → 同步部署文件 → docker compose build → up
# ============================================================

DEPLOY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_DIR="$(cd "$DEPLOY_DIR/.." && pwd)"
LOG_PREFIX="[deploy]"

log() { echo "$LOG_PREFIX $(date '+%Y-%m-%d %H:%M:%S') $*"; }

log "开始部署..."
log "项目目录: $PROJECT_DIR"
log "部署目录: $DEPLOY_DIR"

# 拉取各仓库最新代码
pull_repo() {
  local repo_dir="$1"
  local name="$(basename "$repo_dir")"
  if [ -d "$repo_dir/.git" ]; then
    log "拉取 $name ..."
    cd "$repo_dir"
    git fetch origin main && git reset --hard origin/main
    log "$name 更新完成"
  else
    log "跳过 $name（非 git 仓库）"
  fi
}

pull_repo "$PROJECT_DIR/nihonnuta-backend"
pull_repo "$PROJECT_DIR/nihonnuta-uniapp"
pull_repo "$PROJECT_DIR/netease-api"

# 同步部署配置（从 nihonnuta-backend/deploy/ → 服务器 deploy/）
# 排除 .env（含密钥）和 scripts/（避免覆盖正在执行的脚本）
log "同步部署配置..."
rsync -av --exclude='.env' --exclude='scripts/' \
  "$PROJECT_DIR/nihonnuta-backend/deploy/" \
  "$DEPLOY_DIR/"

# 构建并重启服务
log "构建镜像..."
docker compose -f "$DEPLOY_DIR/docker-compose.prod.yml" build

log "重启服务..."
docker compose -f "$DEPLOY_DIR/docker-compose.prod.yml" up -d

# 清理
log "清理无用镜像..."
docker image prune -f || true

log "部署完成"
