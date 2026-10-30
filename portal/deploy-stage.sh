#!/bin/bash
# DLT Merchant Portal — Stage script (runs on jump host: ifrc)
# Copies build artifacts to ifrc-web-stage and deploys the app.
# This script is uploaded and executed by deploy.sh.
#
# DO NOT run this directly on your local machine.

set -e

TARGET_HOST="ifrc-web-stage"
NODE_ENV_REQUIRED="20"

# ─── App metadata ───────────────────────────────────────────────────
APP_NAME="dlt-portal"
DOMAIN="stage-merchant.dxp.dtic.com.ph"
PORT="8000"
PM2_NAME="dlt-portal"
TAR_NAME="${APP_NAME}-build.tar.gz"
DEPLOY_DIR="/var/www/${APP_NAME}"

# ─── Helpers ────────────────────────────────────────────────────────
log()  { echo ""; echo "▶ $*"; }
ok()   { echo "  ✓ $*"; }

# ─── Copy artifact to target ───────────────────────────────────────
log "Copying artifacts to ${TARGET_HOST}..."
echo "  (You may be prompted for the ${TARGET_HOST} passphrase)"
scp -o StrictHostKeyChecking=no ~/"${TAR_NAME}" "${TARGET_HOST}:~/"
ok "${TAR_NAME} transferred to ${TARGET_HOST}"

# ─── Deploy on target ──────────────────────────────────────────────
log "Deploying ${APP_NAME} on ${TARGET_HOST}..."
echo "  (You may be prompted for the ${TARGET_HOST} passphrase again)"
echo ""

ssh -t -o StrictHostKeyChecking=no "${TARGET_HOST}" << ENDSSH
set -e

echo "  [remote] Checking Node.js version..."
SERVER_NODE=\$(node -e "process.stdout.write(process.versions.node.split('.')[0])" 2>/dev/null || echo "0")
if [ "\$SERVER_NODE" -lt "${NODE_ENV_REQUIRED}" ]; then
  echo "  WARNING: Node.js is v\$SERVER_NODE — recommend upgrading to ${NODE_ENV_REQUIRED}+"
else
  echo "  Node.js v\$(node --version | tr -d 'v') OK"
fi

echo "  [remote] Creating deploy directory..."
sudo mkdir -p "${DEPLOY_DIR}"
sudo chown \$(whoami):\$(whoami) "${DEPLOY_DIR}"

# Preserve the server's .env across the wipe — it is not shipped in the tarball.
if [ -f "${DEPLOY_DIR}/.env" ]; then
  cp "${DEPLOY_DIR}/.env" "/tmp/${APP_NAME}.env.bak"
fi

rm -rf "${DEPLOY_DIR:?}"/* "${DEPLOY_DIR:?}"/.[!.]*

echo "  [remote] Extracting build..."
tar -xzf ~/"${TAR_NAME}" -C "${DEPLOY_DIR}"
rm ~/"${TAR_NAME}"

if [ -f "/tmp/${APP_NAME}.env.bak" ]; then
  mv "/tmp/${APP_NAME}.env.bak" "${DEPLOY_DIR}/.env"
  echo "  [remote] Existing .env restored."
else
  echo "  [remote] WARNING: no .env on server — create ${DEPLOY_DIR}/.env, then 'pm2 restart ${PM2_NAME}'."
fi

echo "  [remote] Installing production dependencies..."
cd "${DEPLOY_DIR}"
if [ -f "package-lock.json" ]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi

echo "  [remote] Restarting with PM2..."
pm2 delete "${PM2_NAME}" 2>/dev/null || true
NODE_ENV=production PORT="${PORT}" pm2 start "npx react-router-serve ./build/server/index.js" \
  --name "${PM2_NAME}" \
  --cwd "${DEPLOY_DIR}"
pm2 save

echo "  [remote] Configuring Nginx..."
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"

if [ ! -f "\$NGINX_CONF" ]; then
  echo "  [remote] Creating Nginx config for ${DOMAIN}..."
  sudo tee "\$NGINX_CONF" > /dev/null << 'NGINX_EOF'
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX_EOF

  sudo ln -sf "\$NGINX_CONF" "/etc/nginx/sites-enabled/${APP_NAME}"
  echo "  [remote] Nginx config created: ${DOMAIN} → 127.0.0.1:${PORT}"
  echo "  [remote] NOTE: Run 'sudo certbot --nginx -d ${DOMAIN}' if this is a first deploy."
else
  echo "  [remote] Nginx config already exists — keeping existing config."
fi

# Always reload Nginx to pick up any cert or config changes
sudo nginx -t && sudo systemctl reload nginx \
  || echo "  WARNING: Nginx reload failed — check manually"
echo "  [remote] Nginx reloaded."

echo ""
echo "  [remote] PM2 status:"
pm2 list --no-color | grep "${PM2_NAME}" || true
echo ""
echo "  [remote] ✓ ${APP_NAME} deployment complete on \$(hostname)"
ENDSSH

# ─── Cleanup artifact on jump host ─────────────────────────────────
log "Cleaning up artifact on jump host..."
rm -f ~/"${TAR_NAME}"
ok "Done"
