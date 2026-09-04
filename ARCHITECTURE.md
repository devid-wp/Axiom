# AXIOM — Architecture Decision

## Current State (legacy)
- Tauri 2.0 + Vite + React 18 + Framer-Motion
- `src/App.tsx` (367 LOC), `styles.css` (282 LOC), `src/data/content.ts` (329 LOC)
- WebView wrapper: requires Node, browser engine, developer setup
- Premium UI achieved but not a real standalone desktop binary

## Problem
Browser-wrapped platform with courses/lessons/quizzes feels like a website, not a creative desktop tool.
Vision requires `LEARN → CREATE → EXPERIMENT` with a practical editor.

## Decision: Rust-native GUI — Slint

### Evaluated
- **iced**: native, Elm-arch, but theming limited, hard to replicate Separantium glass/blur premium feel.
- **egui/eframe**: immediate-mode, excellent for quick canvas prototyping, weak for polished chrome, animations manual.
- **GTK/Qt bindings**: heavy, non-Rust-native ergonomics, packaging complexity.
- **Slint**: declarative QML-like DSL, Rust API, GPU-accelerated (FemtoVG), built-in animations (`animate x { duration; easing; }`), cross-platform (Linux/Win/macOS), `no-frame` custom titlebar, single-binary distribution via `cargo build --release`, maintainable. Best fit for premium desktop + future editor canvas (`TouchArea`, model bindings).

### Plan
Keep web stack as `legacy_web/` reference. New native foundation:

```
Axiom/
  Cargo.toml          # workspace root (axiom-native)
  src/
    main.rs           # Slint bootstrap
    data.rs           # courses/topics (ported from TS)
    studio/
      mod.rs          # Project, Element, Material, Storage
  ui/
    app.slint         # Window, titlebar, sidebar, Study/Explore/Studio pages
    components/       # canvas.slint, inspector.slint, toolbar.slint
  ARCHITECTURE.md
  legacy_web/         # old src/ + src-tauri/ kept for reference (moved)
```

### Studio MVP Design (incremental)
**Data**
```rust
enum ElementKind { Wall, Room, Column, Beam }
enum Material { Concrete, Brick, Glass, Timber, Steel }
struct Element { id, kind, x, y, w, h, material, selected }
struct Project { id, name, elements, created_at }
```
Storage: JSON file at `$XDG_DATA_HOME/axiom/projects.json` (fallback `~/.local/share/axiom/` or `./projects.json`), `serde_json` autosave on change.

**Layout**
```
[Custom Titlebar — traffic + AXIOM — state]
[Sidebar 88px | Content flex ]
Content = Home | Study | Explore | Studio
Studio = [ ToolRail 64px | Canvas flex | Inspector 300px ]
```

Canvas: Slint `Rectangle` grid (12px), `TouchArea` per element, callbacks: `place-element(kind,x,y)`, `select(id)`, `move(id,dx,dy)`, `resize(id,w,h)`, `update-material(id,material)`, snap 8px.

Inspector: position/size numeric fields, material segment, delete/duplicate, dimensions display.

Tools: Select, Wall (240×14), Room (160×120), Column (32×32), Beam (160×12).

**Animations**
Slint `animate` with `ease-in-out` / `spring` where possible; Rust-side `in-out-` for page transitions via state change + `animate` on opacity/x.

**Packaging**
`cargo build --release` → single binary `target/release/axiom` (~15-30MB), no Node/browser. Distribution: ship binary + installer (cargo-bundle, cargo-deb).

**Migration Steps This Session**
1. Preserve useful work (data ported to Rust, visual tokens preserved as Slint `out property <color>`)
2. Establish Slint window + desktop shell (done → commit)
3. Implement Studio workspace with real editable elements (next commit)
4. Local save/load + polishing

Do not build AutoCAD/Blender — one canvas, 4 elements, selection/move/resize/props/save is the bar for visible prototype.
