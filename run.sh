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
  ensure_pkg cargo || die "Rust toolchain not found. Install rustup: https://rustup.rs"
  native_deps
  info "Building native AXIOM (Slint)…"
  cargo build
  ok "Run: ./run.sh native — or the binary is at target/debug/axiom"
  exec cargo run
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
  info "Building web bundle → dist/"
  npm install
  npm run build
  ensure_pkg cargo || die "Rust toolchain not found for native build."
  native_deps
  info "Building native release → target/release/axiom"
  cargo build --release
  ok "Done:"
  ok "  web:    dist/          (static, open in any browser on any OS)"
  ok "  native: target/release/axiom  (OS-specific binary)"
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
  -h|--help|help|"")
    cat <<'EOF'
AXIOM — run script

Usage:
  ./run.sh native   Build & run the native desktop app (Rust/Slint)
  ./run.sh web      Run the web app (Vite dev server, :5173)
  ./run.sh build    Build everything (web dist/ + native release binary)
  ./run.sh check    Show toolchain status

Default (no args) is "native". Works on Arch/Debian/macOS; deps are
auto-installed via pacman/apt/brew when needed.

About macOS: a native binary built on Arch does NOT run on a Mac — the
friend must build from source there (./run.sh native), or simply open
the web build (dist/ or npm run dev), which works identically in any
browser on macOS/Linux/Windows.
EOF
    ;;
  *) die "Unknown command: $1 (try: native, web, build, check, help)" ;;
esac