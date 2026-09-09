mod data;
mod studio;

use slint::{ModelRc, VecModel, SharedString, Model};
use std::rc::Rc;
use std::cell::{RefCell, Cell};

slint::include_modules!();

fn material_to_string(m: studio::Material) -> String {
    match m { studio::Material::Concrete=>"concrete".into(), studio::Material::Brick=>"brick".into(), studio::Material::Glass=>"glass".into(), studio::Material::Timber=>"timber".into(), studio::Material::Steel=>"steel".into()}
}
fn string_to_material(s: &str) -> studio::Material {
    match s { "brick"=> studio::Material::Brick, "glass"=> studio::Material::Glass, "timber"=> studio::Material::Timber, "steel"=> studio::Material::Steel, _=> studio::Material::Concrete }
}
fn kind_to_string(k: studio::ElementKind) -> String {
    match k { studio::ElementKind::Wall=>"wall".into(), studio::ElementKind::Room=>"room".into(), studio::ElementKind::Column=>"column".into(), studio::ElementKind::Beam=>"beam".into()}
}
fn string_to_kind(s: &str) -> studio::ElementKind {
    match s { "room"=> studio::ElementKind::Room, "column"=> studio::ElementKind::Column, "beam"=> studio::ElementKind::Beam, _=> studio::ElementKind::Wall}
}
fn kind_display(k: studio::ElementKind) -> &'static str {
    match k { studio::ElementKind::Wall=>"WALL", studio::ElementKind::Room=>"ROOM", studio::ElementKind::Column=>"COLUMN", studio::ElementKind::Beam=>"BEAM" }
}
fn material_display(m: studio::Material) -> &'static str {
    match m { studio::Material::Concrete=>"Concrete", studio::Material::Brick=>"Brick", studio::Material::Glass=>"Glass", studio::Material::Timber=>"Timber", studio::Material::Steel=>"Steel" }
}
fn thickness_for(k: studio::ElementKind) -> &'static str {
    match k { studio::ElementKind::Wall=>"0.25m", studio::ElementKind::Room=>"0.20m", studio::ElementKind::Column=>"0.40m", studio::ElementKind::Beam=>"0.30m" }
}
fn m(px: f32) -> String {
    let c = ((px / 40.0) * 100.0).round() as i32;
    let neg = c < 0;
    let a = c.abs();
    format!("{}{}.{:02}m", if neg { "-" } else { "" }, a / 100, a % 100)
}
fn coord(x: f32, y: f32) -> String {
    let cx = ((x / 40.0) * 100.0).round() as i32;
    let cy = ((y / 40.0) * 100.0).round() as i32;
    let f = |c: i32| -> String {
        let neg = c < 0; let a = c.abs();
        format!("{}{}.{:02}", if neg { "-" } else { "" }, a / 100, a % 100)
    };
    format!("X {} · Y {}", f(cx), f(cy))
}
fn now_hm() -> String { chrono::Local::now().format("%H:%M").to_string() }

type Snap = Vec<studio::Element>;

fn element_name(proj: &studio::Project, id: &str) -> String {
    if let Some(el) = proj.elements.iter().find(|e| e.id == id) {
        let n = proj.elements.iter().filter(|e| e.kind == el.kind).position(|e| e.id == id).unwrap_or(0) + 1;
        let base = match el.kind { studio::ElementKind::Wall=>"Wall", studio::ElementKind::Room=>"Room", studio::ElementKind::Column=>"Column", studio::ElementKind::Beam=>"Beam" };
        return format!("{} {:02}", base, n);
    }
    String::new()
}

fn rows_equal(a: &StudioElement, b: &StudioElement) -> bool {
    a.id == b.id && a.kind == b.kind && a.name == b.name
        && a.x == b.x && a.y == b.y && a.w == b.w && a.h == b.h
        && a.material == b.material && a.selected == b.selected
}

fn sync_all(app_weak: &slint::Weak<App>, projects_rc: &Rc<RefCell<Vec<studio::Project>>>, current_idx: &Rc<Cell<usize>>, selected_id: &Rc<RefCell<String>>, hist: &Rc<RefCell<Vec<Snap>>>, fut: &Rc<RefCell<Vec<Snap>>>) {
    if let Some(app) = app_weak.upgrade() {
        let projects = projects_rc.borrow();
        let idx = current_idx.get();
        if let Some(proj) = projects.get(idx) {
            let state = app.global::<AppState>();
            let sel = selected_id.borrow().clone();
            state.set_project_name(SharedString::from(proj.name.clone()));
            let rows: Vec<StudioElement> = proj.elements.iter().map(|e| StudioElement {
                id: SharedString::from(e.id.clone()),
                kind: SharedString::from(kind_to_string(e.kind)),
                name: SharedString::from(element_name(proj, &e.id)),
                x: e.x, y: e.y, w: e.w, h: e.h,
                material: SharedString::from(material_to_string(e.material)),
                selected: e.id == sel,
            }).collect();
            // In-place update when shape matches: preserves TouchArea identity,
            // so press/drag/resize gestures survive select+move syncs mid-gesture.
            let cur = state.get_elements();
            let same_shape = cur.row_count() == rows.len()
                && (0..cur.row_count()).all(|i| cur.row_data(i).map(|r| r.id == rows[i].id).unwrap_or(false));
            if same_shape {
                for (i, r) in rows.into_iter().enumerate() {
                    if cur.row_data(i).map(|old| !rows_equal(&old, &r)).unwrap_or(true) {
                        cur.set_row_data(i, r);
                    }
                }
            } else {
                state.set_elements(ModelRc::new(VecModel::from(rows)));
            }
            state.set_studio_selected(SharedString::from(sel.clone()));
            // selection details
            if let Some(el) = proj.elements.iter().find(|e| e.id == sel) {
                let n = proj.elements.iter().filter(|e| e.kind == el.kind).position(|e| e.id == sel).unwrap_or(0) + 1;
                let base = match el.kind { studio::ElementKind::Wall=>"Wall", studio::ElementKind::Room=>"Room", studio::ElementKind::Column=>"Column", studio::ElementKind::Beam=>"Beam" };
                state.set_sel_kind(SharedString::from(kind_display(el.kind)));
                state.set_sel_name(SharedString::from(format!("{} {:02}", base, n)));
                state.set_sel_material(SharedString::from(material_display(el.material)));
                state.set_sel_x(SharedString::from(m(el.x)));
                state.set_sel_y(SharedString::from(m(el.y)));
                state.set_sel_z(SharedString::from("0.00m"));
                state.set_sel_l(SharedString::from(m(el.w)));
                state.set_sel_h(SharedString::from(m(el.h)));
                state.set_sel_t(SharedString::from(thickness_for(el.kind)));
            } else {
                state.set_sel_kind(SharedString::from(""));
                state.set_sel_name(SharedString::from(""));
                state.set_sel_material(SharedString::from(""));
                state.set_sel_x(SharedString::from("—".to_string()));
                state.set_sel_y(SharedString::from("—".to_string()));
                state.set_sel_z(SharedString::from("0.00m"));
                state.set_sel_l(SharedString::from("—".to_string()));
                state.set_sel_h(SharedString::from("—".to_string()));
                state.set_sel_t(SharedString::from("—".to_string()));
            }
            state.set_undo_enabled(!hist.borrow().is_empty());
            state.set_redo_enabled(!fut.borrow().is_empty());
        }
    }
}

fn push_history(hist: &Rc<RefCell<Vec<Snap>>>, fut: &Rc<RefCell<Vec<Snap>>>, projects_rc: &Rc<RefCell<Vec<studio::Project>>>, idx: usize) {
    let cur = projects_rc.borrow().get(idx).map(|p| p.elements.clone()).unwrap_or_default();
    let mut h = hist.borrow_mut();
    if h.last().map(|s| *s == cur).unwrap_or(false) { return; }
    h.push(cur);
    if h.len() > 100 { h.remove(0); }
    fut.borrow_mut().clear();
}

fn main() -> Result<(), slint::PlatformError> {
    let app = App::new()?;
    let app_weak = app.as_weak();

    let mut projects = studio::load_projects();
    if projects.is_empty() { projects.push(studio::Project::default_demo()); }
    let projects_rc = Rc::new(RefCell::new(projects));
    let current_idx = Rc::new(Cell::new(0usize));
    let selected_id: Rc<RefCell<String>> = Rc::new(RefCell::new(String::new()));
    let hist: Rc<RefCell<Vec<Snap>>> = Rc::new(RefCell::new(Vec::new()));
    let fut: Rc<RefCell<Vec<Snap>>> = Rc::new(RefCell::new(Vec::new()));

    sync_all(&app_weak, &projects_rc, &current_idx, &selected_id, &hist, &fut);
    {
        let state = app.global::<AppState>();
        state.set_view(SharedString::from("studio"));
        state.set_lang(SharedString::from("en"));
        state.set_studio_tool(SharedString::from("select"));
        state.set_zoom_label(SharedString::from("100%"));
        state.set_cursor_label(SharedString::from("X — · Y —"));
        state.set_saved_label(SharedString::from("Saved"));
        // screenshot/debug overrides (not part of normal UX)
        if let Ok(view) = std::env::var("AXIOM_DEBUG_VIEW") {
            if !view.is_empty() { state.set_view(SharedString::from(view)); }
        }
        if let Ok(tool) = std::env::var("AXIOM_DEBUG_TOOL") {
            if !tool.is_empty() { state.set_studio_tool(SharedString::from(tool)); }
        }
        // populate courses model
        {
            let lang = state.get_lang().to_string();
            let courses = data::courses();
            let course_models: Vec<CourseData> = courses.iter().map(|c| {
                let title = if lang == "ru" { c.title_ru.clone() } else { c.title_en.clone() };
                let lesson_models: Vec<LessonData> = c.lessons.iter().map(|l| {
                    let lesson_title = if lang == "ru" { l.title_ru.clone() } else { l.title_en.clone() };
                    let body = if lang == "ru" { &l.content_ru } else { &l.content_en };
                    let quiz_q = if lang == "ru" { &l.quiz_q_ru } else { &l.quiz_q_en };
                    let opts = if lang == "ru" { &l.quiz_opts_ru } else { &l.quiz_opts_en };
                    LessonData {
                        id: SharedString::from(l.id.clone()),
                        title: SharedString::from(lesson_title),
                        duration: SharedString::from(l.duration.clone()),
                        level: SharedString::from("beginner"),
                        body1: SharedString::from(body.get(0).cloned().unwrap_or_default()),
                        body2: SharedString::from(body.get(1).cloned().unwrap_or_default()),
                        quiz_q: SharedString::from(quiz_q.clone()),
                        opt_a: SharedString::from(opts.get(0).cloned().unwrap_or_default()),
                        opt_b: SharedString::from(opts.get(1).cloned().unwrap_or_default()),
                        correct: l.quiz_correct as i32,
                    }
                }).collect();
                let lesson_count = c.lessons.len();
                CourseData {
                    id: SharedString::from(c.id.clone()),
                    title: SharedString::from(title),
                    meta: SharedString::from(format!("{} · {}", c.level.split(" • ").next().unwrap_or(""), lesson_count)),
                    level: SharedString::from(c.level.clone()),
                    accent: SharedString::from(c.accent.clone()),
                    lessons: ModelRc::new(VecModel::from(lesson_models)),
                }
            }).collect();
            state.set_courses(ModelRc::new(VecModel::from(course_models)));
            let total: i32 = courses.iter().map(|c| c.lessons.len() as i32).sum();
            state.set_study_total_count(total);
        }
    }
    if std::env::var("AXIOM_DEBUG_SELECT").is_ok() {
        let first = projects_rc.borrow().get(current_idx.get()).and_then(|p| p.elements.first().map(|e| e.id.clone()));
        if let Some(id) = first { *selected_id.borrow_mut() = id; }
        sync_all(&app_weak, &projects_rc, &current_idx, &selected_id, &hist, &fut);
    }

    // select
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        let h = hist.clone(); let f = fut.clone();
        app.global::<AppState>().on_request_select(move |id: SharedString| {
            *sel.borrow_mut() = id.to_string();
            sync_all(&w, &pr, &idx, &sel, &h, &f);
        });
    }
    // deselect
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        let h = hist.clone(); let f = fut.clone();
        app.global::<AppState>().on_request_deselect(move || {
            *sel.borrow_mut() = String::new();
            sync_all(&w, &pr, &idx, &sel, &h, &f);
        });
    }
    // canvas click -> place (or deselect in select/move mode)
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        let h = hist.clone(); let f = fut.clone();
        app.global::<AppState>().on_request_canvas_click(move |x: f32, y: f32| {
            let fresh_tool = w.upgrade().map(|a| a.global::<AppState>().get_studio_tool().to_string()).unwrap_or_default();
            if fresh_tool == "select" || fresh_tool == "move" || fresh_tool == "layers" || fresh_tool == "assets" {
                *sel.borrow_mut() = String::new();
                sync_all(&w, &pr, &idx, &sel, &h, &f);
                return;
            }
            let kind = string_to_kind(&fresh_tool);
            push_history(&h, &f, &pr, idx.get());
            {
                let mut projects = pr.borrow_mut();
                let i = idx.get();
                if let Some(proj) = projects.get_mut(i) {
                    let mut el = studio::Element::new(kind, x, y);
                    el.x = el.x.max(8.0).min(900.0 - el.w - 8.0);
                    el.y = el.y.max(8.0).min(600.0 - el.h - 8.0);
                    let id = el.id.clone();
                    proj.elements.push(el);
                    *sel.borrow_mut() = id;
                }
            }
            sync_all(&w, &pr, &idx, &sel, &h, &f);
            studio::save_projects(&pr.borrow());
            if let Some(a) = w.upgrade() { a.global::<AppState>().set_saved_label(SharedString::from(format!("Saved {}", now_hm()))); }
        });
    }
    // hover readout
    {
        let w = app_weak.clone();
        app.global::<AppState>().on_request_hover(move |x: f32, y: f32| {
            if let Some(a) = w.upgrade() {
                a.global::<AppState>().set_cursor_label(SharedString::from(coord(x, y)));
            }
        });
    }
    // gesture state: press/drag survive model updates because ground truth
    // (grab point, last point) lives here, not in Slint item properties.
    struct DragMove { id: String, gx: f32, gy: f32, armed: bool, dirty: bool }
    struct DragSize { id: String, lx: f32, ly: f32, dirty: bool }
    let drag_move: Rc<RefCell<Option<DragMove>>> = Rc::new(RefCell::new(None));
    let drag_size: Rc<RefCell<Option<DragSize>>> = Rc::new(RefCell::new(None));
    // free move (drag, no history)
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        let h = hist.clone(); let f = fut.clone();
        app.global::<AppState>().on_request_move(move |id: SharedString, dx: f32, dy: f32| {
            {
                let mut projects = pr.borrow_mut();
                let i = idx.get();
                if let Some(proj) = projects.get_mut(i) {
                    if let Some(el) = proj.elements.iter_mut().find(|e| e.id == id.to_string()) {
                        el.x = (el.x + dx).max(0.0).min(900.0 - el.w);
                        el.y = (el.y + dy).max(0.0).min(600.0 - el.h);
                        el.x = (el.x / 8.0).round()*8.0;
                        el.y = (el.y / 8.0).round()*8.0;
                    }
                }
            }
            sync_all(&w, &pr, &idx, &sel, &h, &f);
        });
    }
    // gesture: press records grab point (+selects), moves apply absolute
    // coords, release persists. Immune to item recreation mid-gesture.
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        let h = hist.clone(); let f = fut.clone(); let dm = drag_move.clone(); let ds = drag_size.clone();
        app.global::<AppState>().on_request_press_move(move |id: SharedString, x: f32, y: f32| {
            eprintln!("DBG press-move id={} x={} y={}", id, x, y);
            // Single physical pointer: while any drag is in flight, extra
            // press events can only be synthetic (item recreated under a held
            // button). Ignoring them keeps the original grab point intact.
            if dm.borrow().is_some() || ds.borrow().is_some() { return; }
            let tool = w.upgrade().map(|a| a.global::<AppState>().get_studio_tool().to_string()).unwrap_or_default();
            let armed = tool == "select" || tool == "move";
            *dm.borrow_mut() = Some(DragMove { id: id.to_string(), gx: x, gy: y, armed, dirty: false });
            *sel.borrow_mut() = id.to_string();
            sync_all(&w, &pr, &idx, &sel, &h, &f);
        });
    }
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        let h = hist.clone(); let f = fut.clone(); let dm = drag_move.clone();
        app.global::<AppState>().on_request_drag_move(move |id: SharedString, x: f32, y: f32| {
            eprintln!("DBG drag-move id={} x={} y={}", id, x, y);
            let st = dm.borrow().as_ref().filter(|d| d.id == id.to_string() && d.armed).map(|d| (d.gx, d.gy));
            if let Some((gx, gy)) = st {
                {
                    let mut projects = pr.borrow_mut();
                    let i = idx.get();
                    if let Some(proj) = projects.get_mut(i) {
                        if let Some(el) = proj.elements.iter_mut().find(|e| e.id == id.to_string()) {
                            el.x = (x - gx).max(0.0).min(900.0 - el.w);
                            el.y = (y - gy).max(0.0).min(600.0 - el.h);
                            el.x = (el.x / 8.0).round()*8.0;
                            el.y = (el.y / 8.0).round()*8.0;
                        }
                    }
                }
                if let Some(d) = dm.borrow_mut().as_mut() { d.dirty = true; }
                sync_all(&w, &pr, &idx, &sel, &h, &f);
            }
        });
    }
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        let h = hist.clone(); let f = fut.clone(); let ds = drag_size.clone(); let dm = drag_move.clone();
        app.global::<AppState>().on_request_press_size(move |id: SharedString, x: f32, y: f32| {
            eprintln!("DBG press-size id={} x={} y={}", id, x, y);
            if dm.borrow().is_some() || ds.borrow().is_some() { return; }
            let pt = {
                let projects = pr.borrow();
                projects.get(idx.get())
                    .and_then(|p| p.elements.iter().find(|e| e.id == id.to_string()))
                    .map(|el| (el.w - 12.0 + x, el.h - 12.0 + y))
            };
            if let Some((lx, ly)) = pt {
                *ds.borrow_mut() = Some(DragSize { id: id.to_string(), lx, ly, dirty: false });
            }
            *sel.borrow_mut() = id.to_string();
            sync_all(&w, &pr, &idx, &sel, &h, &f);
        });
    }
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        let h = hist.clone(); let f = fut.clone(); let ds = drag_size.clone();
        app.global::<AppState>().on_request_drag_size(move |id: SharedString, x: f32, y: f32| {
            eprintln!("DBG drag-size id={} x={} y={}", id, x, y);
            let last = ds.borrow().as_ref().filter(|d| d.id == id.to_string()).map(|d| (d.lx, d.ly));
            if let Some((lx, ly)) = last {
                let mut moved = false;
                {
                    let mut projects = pr.borrow_mut();
                    let i = idx.get();
                    if let Some(proj) = projects.get_mut(i) {
                        if let Some(el) = proj.elements.iter_mut().find(|e| e.id == id.to_string()) {
                            let px = el.w - 12.0 + x;
                            let py = el.h - 12.0 + y;
                            let nw = (el.w + (px - lx)).max(12.0).min(600.0);
                            let nh = (el.h + (py - ly)).max(12.0).min(600.0);
                            let nw = (nw / 8.0).round()*8.0;
                            let nh = (nh / 8.0).round()*8.0;
                            if nw != el.w || nh != el.h { moved = true; }
                            el.w = nw; el.h = nh;
                            if let Some(d) = ds.borrow_mut().as_mut() { d.lx = px; d.ly = py; d.dirty = true; }
                        }
                    }
                }
                sync_all(&w, &pr, &idx, &sel, &h, &f);
                if moved { studio::save_projects(&pr.borrow()); }
            }
        });
    }
    {
        let pr = projects_rc.clone();
        let w = app_weak.clone();
        let dm = drag_move.clone(); let ds = drag_size.clone();
        app.global::<AppState>().on_request_release(move || {
            eprintln!("DBG release");
            let mut dirty = false;
            if let Some(d) = dm.borrow_mut().take() { dirty |= d.dirty; }
            if let Some(d) = ds.borrow_mut().take() { dirty |= d.dirty; }
            if dirty {
                studio::save_projects(&pr.borrow());
                if let Some(a) = w.upgrade() { a.global::<AppState>().set_saved_label(SharedString::from(format!("Saved {}", now_hm()))); }
            }
        });
    }
    // discrete nudge (with history)
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        let h = hist.clone(); let f = fut.clone();
        app.global::<AppState>().on_request_nudge(move |id: SharedString, dx: f32, dy: f32| {
            push_history(&h, &f, &pr, idx.get());
            {
                let mut projects = pr.borrow_mut();
                let i = idx.get();
                if let Some(proj) = projects.get_mut(i) {
                    if let Some(el) = proj.elements.iter_mut().find(|e| e.id == id.to_string()) {
                        el.x = (el.x + dx).max(0.0).min(900.0 - el.w);
                        el.y = (el.y + dy).max(0.0).min(600.0 - el.h);
                        el.x = (el.x / 8.0).round()*8.0;
                        el.y = (el.y / 8.0).round()*8.0;
                    }
                }
            }
            sync_all(&w, &pr, &idx, &sel, &h, &f);
            studio::save_projects(&pr.borrow());
            if let Some(a) = w.upgrade() { a.global::<AppState>().set_saved_label(SharedString::from(format!("Saved {}", now_hm()))); }
        });
    }
    // resize (drag handle, no history)
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        let h = hist.clone(); let f = fut.clone();
        app.global::<AppState>().on_request_resize(move |id: SharedString, dw: f32, dh: f32| {
            {
                let mut projects = pr.borrow_mut();
                let i = idx.get();
                if let Some(proj) = projects.get_mut(i) {
                    if let Some(el) = proj.elements.iter_mut().find(|e| e.id == id.to_string()) {
                        if dw.abs() < 60.0 && dh.abs() < 60.0 && (dw != 0.0 || dh != 0.0) {
                            el.w = (el.w + dw).max(12.0).min(600.0);
                            el.h = (el.h + dh).max(12.0).min(600.0);
                        } else {
                            if dw > 20.0 { el.w = dw.max(12.0).min(600.0); }
                            if dh > 20.0 { el.h = dh.max(12.0).min(600.0); }
                        }
                        el.w = (el.w / 8.0).round()*8.0;
                        el.h = (el.h / 8.0).round()*8.0;
                    }
                }
            }
            sync_all(&w, &pr, &idx, &sel, &h, &f);
            studio::save_projects(&pr.borrow());
        });
    }
    // discrete size step (with history)
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        let h = hist.clone(); let f = fut.clone();
        app.global::<AppState>().on_request_size_step(move |id: SharedString, dw: f32, dh: f32| {
            push_history(&h, &f, &pr, idx.get());
            {
                let mut projects = pr.borrow_mut();
                let i = idx.get();
                if let Some(proj) = projects.get_mut(i) {
                    if let Some(el) = proj.elements.iter_mut().find(|e| e.id == id.to_string()) {
                        el.w = (el.w + dw).max(12.0).min(600.0);
                        el.h = (el.h + dh).max(12.0).min(600.0);
                        el.w = (el.w / 8.0).round()*8.0;
                        el.h = (el.h / 8.0).round()*8.0;
                    }
                }
            }
            sync_all(&w, &pr, &idx, &sel, &h, &f);
            studio::save_projects(&pr.borrow());
            if let Some(a) = w.upgrade() { a.global::<AppState>().set_saved_label(SharedString::from(format!("Saved {}", now_hm()))); }
        });
    }
    // material
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        let h = hist.clone(); let f = fut.clone();
        app.global::<AppState>().on_request_material(move |id: SharedString, mat: SharedString| {
            push_history(&h, &f, &pr, idx.get());
            {
                let mut projects = pr.borrow_mut();
                let i = idx.get();
                if let Some(proj) = projects.get_mut(i) {
                    if let Some(el) = proj.elements.iter_mut().find(|e| e.id == id.to_string()) {
                        el.material = string_to_material(&mat);
                    }
                }
            }
            sync_all(&w, &pr, &idx, &sel, &h, &f);
            studio::save_projects(&pr.borrow());
            if let Some(a) = w.upgrade() { a.global::<AppState>().set_saved_label(SharedString::from(format!("Saved {}", now_hm()))); }
        });
    }
    // delete
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        let h = hist.clone(); let f = fut.clone();
        app.global::<AppState>().on_request_delete(move |id: SharedString| {
            push_history(&h, &f, &pr, idx.get());
            {
                let mut projects = pr.borrow_mut();
                let i = idx.get();
                if let Some(proj) = projects.get_mut(i) {
                    proj.elements.retain(|e| e.id != id.to_string());
                    if *sel.borrow() == id.to_string() { *sel.borrow_mut() = String::new(); }
                }
            }
            sync_all(&w, &pr, &idx, &sel, &h, &f);
            studio::save_projects(&pr.borrow());
            if let Some(a) = w.upgrade() { a.global::<AppState>().set_saved_label(SharedString::from(format!("Saved {}", now_hm()))); }
        });
    }
    // duplicate
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        let h = hist.clone(); let f = fut.clone();
        app.global::<AppState>().on_request_duplicate(move |id: SharedString| {
            push_history(&h, &f, &pr, idx.get());
            {
                let mut projects = pr.borrow_mut();
                let i = idx.get();
                if let Some(proj) = projects.get_mut(i) {
                    if let Some(el) = proj.elements.iter().find(|e| e.id == id.to_string()).cloned() {
                        let mut dup = el.clone();
                        dup.id = uuid::Uuid::new_v4().to_string();
                        dup.x += 16.0; dup.y += 16.0;
                        let nid = dup.id.clone();
                        proj.elements.push(dup);
                        *sel.borrow_mut() = nid;
                    }
                }
            }
            sync_all(&w, &pr, &idx, &sel, &h, &f);
            studio::save_projects(&pr.borrow());
            if let Some(a) = w.upgrade() { a.global::<AppState>().set_saved_label(SharedString::from(format!("Saved {}", now_hm()))); }
        });
    }
    // undo
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        let h = hist.clone(); let f = fut.clone();
        app.global::<AppState>().on_request_undo(move || {
            let prev = h.borrow_mut().pop();
            if let Some(prev) = prev {
                let cur = pr.borrow().get(idx.get()).map(|p| p.elements.clone()).unwrap_or_default();
                f.borrow_mut().push(cur);
                {
                    let mut projects = pr.borrow_mut();
                    if let Some(proj) = projects.get_mut(idx.get()) {
                        proj.elements = prev;
                        let ids: Vec<String> = proj.elements.iter().map(|e| e.id.clone()).collect();
                        if !ids.contains(&sel.borrow().clone()) { *sel.borrow_mut() = String::new(); }
                    }
                }
                sync_all(&w, &pr, &idx, &sel, &h, &f);
                studio::save_projects(&pr.borrow());
            }
        });
    }
    // redo
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        let h = hist.clone(); let f = fut.clone();
        app.global::<AppState>().on_request_redo(move || {
            let next = f.borrow_mut().pop();
            if let Some(next) = next {
                let cur = pr.borrow().get(idx.get()).map(|p| p.elements.clone()).unwrap_or_default();
                h.borrow_mut().push(cur);
                {
                    let mut projects = pr.borrow_mut();
                    if let Some(proj) = projects.get_mut(idx.get()) {
                        proj.elements = next;
                        let ids: Vec<String> = proj.elements.iter().map(|e| e.id.clone()).collect();
                        if !ids.contains(&sel.borrow().clone()) { *sel.borrow_mut() = String::new(); }
                    }
                }
                sync_all(&w, &pr, &idx, &sel, &h, &f);
                studio::save_projects(&pr.borrow());
            }
        });
    }
    // save
    {
        let pr = projects_rc.clone();
        let w = app_weak.clone();
        app.global::<AppState>().on_request_save(move || {
            studio::save_projects(&pr.borrow());
            if let Some(a) = w.upgrade() { a.global::<AppState>().set_saved_label(SharedString::from(format!("Saved {}", now_hm()))); }
            println!("AXIOM: saved {} projects", pr.borrow().len());
        });
    }
    // export (writes a human-readable copy next to the store)
    {
        let pr = projects_rc.clone();
        let w = app_weak.clone();
        app.global::<AppState>().on_request_export(move || {
            studio::save_projects(&pr.borrow());
            let path = studio::export_copy(&pr.borrow());
            if let Some(a) = w.upgrade() { a.global::<AppState>().set_saved_label(SharedString::from(format!("Exported {}", now_hm()))); }
            println!("AXIOM: exported -> {}", path);
        });
    }
    // new project
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        let h = hist.clone(); let f = fut.clone();
        app.global::<AppState>().on_request_new_project(move || {
            {
                let mut projects = pr.borrow_mut();
                let nid = projects.len()+1;
                projects.push(studio::Project::new(format!("Project {}", nid)));
                let ni = projects.len()-1;
                idx.set(ni);
                *sel.borrow_mut() = String::new();
            }
            hist.borrow_mut().clear();
            fut.borrow_mut().clear();
            sync_all(&w, &pr, &idx, &sel, &h, &f);
            studio::save_projects(&pr.borrow());
            if let Some(a) = w.upgrade() { a.global::<AppState>().set_saved_label(SharedString::from(format!("Saved {}", now_hm()))); }
        });
    }
    // study — set course
    {
        let w = app_weak.clone();
        app.global::<AppState>().on_request_set_course(move |i: i32| {
            if let Some(a) = w.upgrade() {
                let state = a.global::<AppState>();
                state.set_study_course(i);
                state.set_study_lesson(0);
                state.set_study_picked(-1);
            }
        });
    }
    // study — set lesson
    {
        let w = app_weak.clone();
        app.global::<AppState>().on_request_set_lesson(move |i: i32| {
            if let Some(a) = w.upgrade() {
                let state = a.global::<AppState>();
                state.set_study_lesson(i);
                state.set_study_picked(-1);
            }
        });
    }
    // study — quiz answer
    {
        let w = app_weak.clone();
        app.global::<AppState>().on_request_quiz_answer(move |answer: i32| {
            if let Some(a) = w.upgrade() {
                let state = a.global::<AppState>();
                state.set_study_picked(answer);
                let course = state.get_study_course() as usize;
                let lesson = state.get_study_lesson() as usize;
                let courses = state.get_courses();
                if let Some(c) = courses.row_data(course) {
                    if let Some(l) = c.lessons.row_data(lesson) {
                        if answer == l.correct {
                            let done = state.get_study_done_count() + 1;
                            state.set_study_done_count(done);
                            let total = state.get_study_total_count();
                            if total > 0 {
                                state.set_study_pct(SharedString::from(format!("{}%", (done as f32 / total as f32 * 100.0).round() as i32)));
                            }
                        }
                    }
                }
            }
        });
    }
    // practice — switch to studio
    {
        let w = app_weak.clone();
        app.global::<AppState>().on_request_practice(move || {
            if let Some(a) = w.upgrade() {
                a.global::<AppState>().set_view(SharedString::from("studio"));
            }
        });
    }

    app.run()
}
