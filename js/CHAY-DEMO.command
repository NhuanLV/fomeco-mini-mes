#!/bin/bash
# Chạy FOMECO Mini-MES trên máy: http://localhost:5173
SRC="$(cd "$(dirname "$0")/web" && pwd)"
DEST="$HOME/fomeco-mes-web"
echo "== Sao chép mã nguồn sang $DEST (tránh cài thư viện vào Google Drive) =="
mkdir -p "$DEST"
rsync -a --delete --exclude node_modules --exclude dist "$SRC/" "$DEST/"
cd "$DEST" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$PATH"
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "!! Máy chưa cài Node.js. Tải tại https://nodejs.org (bản LTS), cài xong bấm đúp lại file này."
  read -r -p "Nhấn Enter để đóng..."
  exit 1
fi
echo "Node $(node -v)"
echo "== Cài thư viện (lần đầu mất 1-3 phút) =="
npm install --no-audit --no-fund 2>&1 | tail -20
echo "== Khởi động web: http://localhost:5173 =="
npx vite --port 5173 --strictPort 2>&1 | tee "$DEST/dev.log"
