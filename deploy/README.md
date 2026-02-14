# Production Deployment (ESC)

This folder is meant to be copied to your ESC and used with Docker Compose.

## 1) Prepare server
Install Docker + Compose, then create a deploy directory:

```bash
mkdir -p /opt/nihonnuta
```

Copy this folder to `/opt/nihonnuta` on your ESC (so that `docker-compose.prod.yml` and `.env` are in `/opt/nihonnuta`).

## 2) Configure `.env`
Create `/opt/nihonnuta/.env` using `deploy/.env.example` as a template.

Required values:
- `PG_PASSWORD`
- `MINIO_SECRET_KEY`
- `MINIO_PUBLIC_HOST` (your server IP or domain)

## 3) First-time startup
```bash
cd /opt/nihonnuta
docker compose -f docker-compose.prod.yml up -d
```

## 4) GitHub Secrets (both repos)
Set these secrets in **both** GitHub repositories:

- `SSH_HOST` = your ESC IP
- `SSH_USER` = ssh user (e.g. root)
- `SSH_KEY` = SSH private key (not password)
- `SSH_PORT` = SSH port (e.g. 22)
- `DEPLOY_PATH` = `/opt/nihonnuta`
- `GHCR_USER` = your GitHub username (e.g. `Gohoy`)
- `GHCR_TOKEN` = a GitHub PAT with `read:packages`
- `VITE_SERVER_BASEURL` = `http://110.40.139.66:5217` (frontend repo only)

## 5) Deploy
Push to `main` on either repo. The Actions workflow will:
1. Build and push Docker images to GHCR.
2. SSH into ESC and run `docker compose pull` + `up -d`.
