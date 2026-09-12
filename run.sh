#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info(){ printf "${CYAN}[axiom]${NC} %s\n" "$*"; }
ok(){   printf "${GREEN}[axiom]${NC} %s\n" "$*"; }
warn(){ printf "${YELLOW}[axiom]${NC} %s\n" "$*"; }
die(){  printf "${RED}[axiom]${NC} %s\n" "$*" >&2; exit 1; }

cd "$(dirname "$0")"

detect_os() {
  case "$(uname -s)" in
    Linux)
      if command -v pacman >/dev/null 2>&1; then echo "arch"
      elif command -v apt-get >/dev/null 2>&1; then echo "debian"
      else echo "linux-other"; fi ;;
    Darwin) echo "macos" ;;
    *) echo "unknown" ;;
  esac
}

ensure_pkg() { command -v "$1" >/dev/null 2>&1; }

NATIVE_DEPS=(wayland wayland-protocols libxkbcommon fontconfig freetype2)

native_deps() {
  local os os_list missing=()
  os=$(detect_os)
  case "$os" in
    arch)
      for d in "${NATIVE_DEPS[@]}"; do
        if ! pacman -Qi "$d" >/dev/null 2>&1; then missing+=("$d"); fi
      done
      if [ ${#missing[@]} -gt 0 ]; then
        warn "Missing native deps, installing: ${missing[*]}"
        sudo pacman -S --needed --noconfirm "${missing[@]}"
      fi
      ;;
    debian)
      missing=(libxkbcommon-dev libfontconfig-dev libfreetype-dev libwayland-dev)
      for d in "${missing[@]}"; do
        if ! dpkg -s "$d" >/dev/null 2>&1 && ! dpkg -s "${d%-dev}" >/dev/null 2>&1 \
           && ! dpkg -s "${d%-dev}2" >/dev/null 2>&1; then
          os_list+=( "$d" )
        fi
      done
      if [ ${#os_list[@]} -gt 0 ]; then
        warn "Missing native deps, installing: ${os_list[*]}"
        sudo apt-get update
        sudo apt-get install -y "${os_list[@]}"
      fi
      ;;
    macos)
      if ! ensure_pkg brew; then
        die "Homebrew not found on macOS. Install it: https://brew.sh"
      fi
      info "macOS: Slint needs only the system frameworks; nothing extra to install."
      ;;
  esac
}

cmd_native() {
  warn "Native build (Rust/Slint) is FROZEN — primary platform is web (Vite/React)."
  warn "If you really need it: git log -- src/ ui/ ; cargo build"
  die "Aborted: native is frozen."
}

cmd_web() {
  ensure_pkg node || die "Node.js not found. Install it: https://nodejs.org"
  ensure_pkg npm || die "npm not found. Install it with node."
  if [ ! -d node_modules ]; then
    info "Installing web dependencies…"
    npm install
  fi
  info "Starting web AXIOM at http://localhost:5173"
  exec npm run dev
}

cmd_build() {
  ensure_pkg node || die "Node.js not found."
  info "Building web bundle → dist/ (PRIMARY platform)"
  npm install
  npm run build
  ok "Done:"
  ok "  web:    dist/          (static, open in any browser on any OS)"
  warn "  native: FROZEN (src/ ui/ Cargo.toml) — not built. See ARCHITECTURE.md."
}

cmd_check() {
  local os; os=$(detect_os)
  info "OS: $(uname -s) ($os)"
  info "node: $(command -v node >/dev/null 2>&1 && node --version || echo MISSING)"
  info "npm:  $(command -v npm  >/dev/null 2>&1 && npm --version  || echo MISSING)"
  info "cargo:$(command -v cargo>/dev/null 2>&1 && cargo --version || echo MISSING)"
}

case "${1:-}" in
  native|web|build|check) "cmd_${1}" ;;
  "") cmd_web ;;
  -h|--help|help)
    cat <<'EOF'
AXIOM — run script (PRIMARY: web, NATIVE FROZEN)

Usage:
  ./run.sh web      Run the web app (Vite dev server, :5173) [default]
  ./run.sh build    Build web dist/ only
  ./run.sh check    Show toolchain status
  ./run.sh native   FROZEN — refuses to build (src/ ui/ archived, see ARCHITECTURE.md)

Default (no args) is "web". Works on Arch/Debian/macOS; deps are
auto-installed via pacman/apt/brew when needed.

About macOS: just open the web build (dist/ or npm run dev), which works
identically in any browser on macOS/Linux/Windows. Native (Rust/Slint)
is FROZEN and not distributed.
EOF
    ;;
  *) die "Unknown command: $1 (try: web, build, check, help; native is FROZEN)" ;;
esac