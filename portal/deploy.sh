#!/bin/bash
# DLT Merchant Portal — Local deploy script (run this on your machine)
# Builds the app, uploads artifacts to the jump host,
# then triggers deploy-stage.sh on the jump host which handles the hop
# to the target server.
#
# Usage:
#   ./deploy.sh

set -e

JUMP_HOST="ifrc"
STAGE_SCRIPT="deploy-stage.sh"
NODE_ENV_REQUIRED="20"

# ─── App metadata ───────────────────────────────────────────────────
APP_NAME="dlt-portal"
DOMAIN="stage-merchant.dxp.dtic.com.ph"
PORT="8000"
PM2_NAME="dlt-portal"

# ─── Helpers ────────────────────────────────────────────────────────
log()  { echo ""; echo "▶ $*"; }
ok()   { echo "  ✓ $*"; }
die()  { echo ""; echo "✗ ERROR: $*" >&2; exit 1; }

# ─── Preflight ──────────────────────────────────────────────────────
log "Preflight checks..."

NODE_VERSION=$(node -e "process.stdout.write(process.versions.node.split('.')[0])" 2>/dev/null || echo "0")
if [ "$NODE_VERSION" -lt "$NODE_ENV_REQUIRED" ]; then
  die "Node.js ${NODE_ENV_REQUIRED}+ required (found ${NODE_VERSION})."
fi
ok "Node.js v$(node --version | tr -d 'v')"

if ! ssh -G "${JUMP_HOST}" &>/dev/null; then
  die "SSH host '${JUMP_HOST}' not found in ~/.ssh/config."
fi
ok "SSH config entry found for ${JUMP_HOST}"

if [ ! -f "${STAGE_SCRIPT}" ]; then
  die "${STAGE_SCRIPT} not found in current directory."
fi
ok "${STAGE_SCRIPT} present"

if [ ! -f ".env" ]; then
  die ".env not found. Copy .env.example and fill in values."
fi
ok ".env present"

# ─── Confirmation ───────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   DLT Merchant Portal — Stage Deploy     ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Jump host : ${JUMP_HOST}"
echo "  Target    : ifrc-web-stage  (passphrase on jump host)"
echo "  App       : ${APP_NAME}"
echo "  Domain    : ${DOMAIN}  (not yet created — first deploy needs DNS + certbot)"
echo "  Port      : ${PORT}"
echo "  PM2 name  : ${PM2_NAME}"
echo ""
read -r -p "Proceed? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

# ─── Build ─────────────────────────────────────────────────────────
TAR_NAME="${APP_NAME}-build.tar.gz"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Building: ${APP_NAME}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log "Step 1: Installing dependencies..."
npm install

log "Step 2: Building application..."
NODE_ENV=production npm run build

log "Step 3: Archiving build (no node_modules)..."

# Only ship the build output + manifest files.
# Server runs npm ci --omit=dev to get the correct Linux binaries.
# .env is intentionally NOT shipped — the server keeps its own.
# Local .env is still required (preflight) for build-time env inlining.
#
# The bundled server resolves runtime assets relative to the deploy root
# (e.g. app/.server/dlt/pdf.ts -> <root>/assets/dlt.png), so stage a
# top-level assets/ dir from app/assets/ for the tarball.
STAGED_ASSETS=0
if [ ! -d "assets" ]; then
  mkdir -p assets
  STAGED_ASSETS=1
fi
cp -R app/assets/. assets/

FILES_TO_ARCHIVE="public package.json assets"
if [ -f "package-lock.json" ]; then FILES_TO_ARCHIVE="$FILES_TO_ARCHIVE package-lock.json"; fi

COPYFILE_DISABLE=1 tar --no-xattrs \
  --exclude='.react-router' \
  --exclude='.kiro' \
  --exclude='.agents' \
  --exclude='.opencode' \
  --exclude='.mcp.json' \
  --exclude='opencode.json' \
  --exclude='skills-lock.json' \
  --exclude='tests' \
  --exclude='docs' \
  --exclude='playwright-report' \
  --exclude='test-results' \
  --exclude='coverage' \
  -czf "$TAR_NAME" build $FILES_TO_ARCHIVE 2>/dev/null || \
tar \
  --exclude='.react-router' \
  --exclude='.kiro' \
  --exclude='.agents' \
  --exclude='.opencode' \
  --exclude='.mcp.json' \
  --exclude='opencode.json' \
  --exclude='skills-lock.json' \
  --exclude='tests' \
  --exclude='docs' \
  --exclude='playwright-report' \
  --exclude='test-results' \
  --exclude='coverage' \
  -czf "$TAR_NAME" build $FILES_TO_ARCHIVE

if [ "$STAGED_ASSETS" -eq 1 ]; then rm -rf assets; fi

ok "Archive: ${TAR_NAME} ($(du -sh "$TAR_NAME" | cut -f1))"

# ─── Upload artifacts + stage script to jump host ───────────────────
log "Step 4: Uploading artifacts and stage script to ${JUMP_HOST}..."
scp -o StrictHostKeyChecking=no "${TAR_NAME}" "${STAGE_SCRIPT}" "${JUMP_HOST}:~/"
ok "Uploaded ${TAR_NAME} and ${STAGE_SCRIPT} to ${JUMP_HOST}:~/"

# ─── Trigger remote deploy ─────────────────────────────────────────
log "Step 5: Running deploy on ${JUMP_HOST} → ifrc-web-stage..."
echo "  (You will be prompted for the ifrc-web-stage passphrase on the jump host)"
echo ""
ssh -t -o StrictHostKeyChecking=no "${JUMP_HOST}" \
  "bash ~/${STAGE_SCRIPT} && rm -f ~/${STAGE_SCRIPT}"

# ─── Local cleanup ─────────────────────────────────────────────────
log "Step 6: Cleaning up local artifacts..."
rm -f "$TAR_NAME"
ok "Done"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   ✅ Deploy triggered successfully!      ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  ${APP_NAME} : http://${DOMAIN}  (PM2: ${PM2_NAME}, port ${PORT})"
echo ""
echo "  First deploy? Run on ifrc-web-stage:"
echo "    sudo certbot --nginx -d ${DOMAIN}"
echo ""
