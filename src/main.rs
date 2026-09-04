mod data;
mod studio;

use slint::{ModelRc, VecModel, SharedString};
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

fn sync_all(app_weak: &slint::Weak<App>, projects_rc: &Rc<RefCell<Vec<studio::Project>>>, current_idx: &Rc<Cell<usize>>, selected_id: &Rc<RefCell<String>>) {
    if let Some(app) = app_weak.upgrade() {
        let projects = projects_rc.borrow();
        let idx = current_idx.get();
        if let Some(proj) = projects.get(idx) {
            let state = app.global::<AppState>();
            let sel = selected_id.borrow().clone();
            state.set_project_name(SharedString::from(proj.name.clone()));
            let model = VecModel::from(
                proj.elements.iter().map(|e| StudioElement {
                    id: SharedString::from(e.id.clone()),
                    kind: SharedString::from(kind_to_string(e.kind)),
                    x: e.x, y: e.y, w: e.w, h: e.h,
                    material: SharedString::from(material_to_string(e.material)),
                    selected: e.id == sel,
                }).collect::<Vec<_>>()
            );
            state.set_elements(ModelRc::new(model));
            state.set_studio_selected(SharedString::from(sel));
        }
    }
}

fn main() -> Result<(), slint::PlatformError> {
    let app = App::new()?;
    let app_weak = app.as_weak();

    let mut projects = studio::load_projects();
    if projects.is_empty() { projects.push(studio::Project::default_demo()); }
    let projects_rc = Rc::new(RefCell::new(projects));
    let current_idx = Rc::new(Cell::new(0usize));
    let selected_id: Rc<RefCell<String>> = Rc::new(RefCell::new(String::new()));

    sync_all(&app_weak, &projects_rc, &current_idx, &selected_id);
    {
        let state = app.global::<AppState>();
        state.set_view(SharedString::from("home"));
        state.set_lang(SharedString::from("en"));
        state.set_studio_tool(SharedString::from("select"));
    }

    // select
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        app.global::<AppState>().on_request_select(move |id: SharedString| {
            *sel.borrow_mut() = id.to_string();
            sync_all(&w, &pr, &idx, &sel);
        });
    }
    // canvas click -> place
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        app.global::<AppState>().on_request_canvas_click(move |x: f32, y: f32| {
            let fresh_tool = w.upgrade().map(|a| a.global::<AppState>().get_studio_tool().to_string()).unwrap_or_default();
            if fresh_tool == "select" { return; }
            let kind = string_to_kind(&fresh_tool);
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
            sync_all(&w, &pr, &idx, &sel);
            studio::save_projects(&pr.borrow());
        });
    }
    // move
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
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
            sync_all(&w, &pr, &idx, &sel);
        });
    }
    // resize
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
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
            sync_all(&w, &pr, &idx, &sel);
            studio::save_projects(&pr.borrow());
        });
    }
    // material
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        app.global::<AppState>().on_request_material(move |id: SharedString, mat: SharedString| {
            {
                let mut projects = pr.borrow_mut();
                let i = idx.get();
                if let Some(proj) = projects.get_mut(i) {
                    if let Some(el) = proj.elements.iter_mut().find(|e| e.id == id.to_string()) {
                        el.material = string_to_material(&mat);
                    }
                }
            }
            sync_all(&w, &pr, &idx, &sel);
            studio::save_projects(&pr.borrow());
        });
    }
    // delete
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        app.global::<AppState>().on_request_delete(move |id: SharedString| {
            {
                let mut projects = pr.borrow_mut();
                let i = idx.get();
                if let Some(proj) = projects.get_mut(i) {
                    proj.elements.retain(|e| e.id != id.to_string());
                    if *sel.borrow() == id.to_string() { *sel.borrow_mut() = String::new(); }
                }
            }
            sync_all(&w, &pr, &idx, &sel);
            studio::save_projects(&pr.borrow());
        });
    }
    // duplicate
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        app.global::<AppState>().on_request_duplicate(move |id: SharedString| {
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
            sync_all(&w, &pr, &idx, &sel);
            studio::save_projects(&pr.borrow());
        });
    }
    // save
    {
        let pr = projects_rc.clone();
        app.global::<AppState>().on_request_save(move || {
            studio::save_projects(&pr.borrow());
            println!("AXIOM: saved {} projects", pr.borrow().len());
        });
    }
    // new project
    {
        let w = app_weak.clone(); let pr = projects_rc.clone(); let sel = selected_id.clone(); let idx = current_idx.clone();
        app.global::<AppState>().on_request_new_project(move || {
            {
                let mut projects = pr.borrow_mut();
                let nid = projects.len()+1;
                projects.push(studio::Project::new(format!("Project {}", nid)));
                let ni = projects.len()-1;
                idx.set(ni);
                *sel.borrow_mut() = String::new();
            }
            sync_all(&w, &pr, &idx, &sel);
            studio::save_projects(&pr.borrow());
        });
    }

    app.run()
}
