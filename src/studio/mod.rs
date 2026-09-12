use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum ElementKind { Wall, Room, Column, Beam }

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Material { Concrete, Brick, Glass, Timber, Steel }

impl Material {
    pub fn label(&self) -> &'static str {
        match self { Self::Concrete=>"Concrete", Self::Brick=>"Brick", Self::Glass=>"Glass", Self::Timber=>"Timber", Self::Steel=>"Steel" }
    }
    pub fn color(&self) -> (u8,u8,u8) {
        match self {
            Self::Concrete => (168,162,158),
            Self::Brick => (180,83,45),
            Self::Glass => (125,211,252),
            Self::Timber => (180,130,70),
            Self::Steel => (148,163,184),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Element {
    pub id: String,
    pub kind: ElementKind,
    pub x: f32, pub y: f32, pub w: f32, pub h: f32,
    pub material: Material,
}

impl Element {
    pub fn new(kind: ElementKind, x:f32, y:f32) -> Self {
        let (w,h) = match kind {
            ElementKind::Wall => (240.0, 14.0),
            ElementKind::Room => (180.0, 130.0),
            ElementKind::Column => (34.0, 34.0),
            ElementKind::Beam => (170.0, 14.0),
        };
        Self { id: Uuid::new_v4().to_string(), kind, x, y, w, h, material: Material::Concrete }
    }
    pub fn label(&self) -> &'static str {
        match self.kind { ElementKind::Wall=>"Wall", ElementKind::Room=>"Room", ElementKind::Column=>"Column", ElementKind::Beam=>"Beam" }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub elements: Vec<Element>,
}

impl Project {
    pub fn new(name: impl Into<String>) -> Self {
        Self { id: Uuid::new_v4().to_string(), name: name.into(), created_at: Utc::now(), elements: Vec::new() }
    }
    pub fn default_demo() -> Self {
        let mut p = Self::new("Pavilion 01");
        p.elements.push(Element { id: Uuid::new_v4().to_string(), kind: ElementKind::Room, x: 80.0, y: 90.0, w: 220.0, h: 160.0, material: Material::Concrete });
        p.elements.push(Element { id: Uuid::new_v4().to_string(), kind: ElementKind::Column, x: 120.0, y: 120.0, w: 28.0, h: 28.0, material: Material::Concrete });
        p.elements.push(Element { id: Uuid::new_v4().to_string(), kind: ElementKind::Beam, x: 80.0, y: 70.0, w: 220.0, h: 12.0, material: Material::Steel });
        p.elements.push(Element { id: Uuid::new_v4().to_string(), kind: ElementKind::Wall, x: 340.0, y: 140.0, w: 160.0, h: 12.0, material: Material::Brick });
        p
    }
}

use std::path::PathBuf;
use std::fs;

fn projects_path() -> PathBuf {
    if let Some(dirs) = dirs::data_dir() {
        let p = dirs.join("axiom");
        let _ = fs::create_dir_all(&p);
        p.join("projects.json")
    } else {
        PathBuf::from("projects.json")
    }
}

pub fn save_to_path(projects: &[Project], path: &std::path::Path) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)?;
        }
    }
    let s = serde_json::to_string_pretty(projects)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
    fs::write(path, s)
}

pub fn load_from_path(path: &std::path::Path) -> Vec<Project> {
    if let Ok(s) = fs::read_to_string(path) {
        if let Ok(v) = serde_json::from_str(&s) { return v; }
    }
    vec![Project::default_demo()]
}

pub fn load_projects() -> Vec<Project> {
    load_from_path(&projects_path())
}

pub fn save_projects(projects: &[Project]) {
    let _ = save_to_path(projects, &projects_path());
}

pub fn export_copy(projects: &[Project]) -> String {
    let dest = if let Some(dirs) = dirs::data_dir() {
        let d = dirs.join("axiom");
        let _ = fs::create_dir_all(&d);
        d.join("axiom-export.json")
    } else {
        PathBuf::from("axiom-export.json")
    };
    if let Ok(s) = serde_json::to_string_pretty(projects) {
        let _ = fs::write(&dest, s);
    }
    dest.to_string_lossy().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_file(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "axiom-test-{}-{}-{}.json",
            std::process::id(),
            Uuid::new_v4(),
            name
        ))
    }

    #[test]
    fn element_new_sets_kind_pos_and_defaults() {
        let el = Element::new(ElementKind::Wall, 10.0, 20.0);
        assert_eq!(el.kind, ElementKind::Wall);
        assert_eq!(el.x, 10.0);
        assert_eq!(el.y, 20.0);
        assert_eq!(el.material, Material::Concrete);
        assert!(!el.id.is_empty());
    }

    #[test]
    fn element_new_dimensions_per_kind() {
        let cases = [
            (ElementKind::Wall, 240.0, 14.0),
            (ElementKind::Room, 180.0, 130.0),
            (ElementKind::Column, 34.0, 34.0),
            (ElementKind::Beam, 170.0, 14.0),
        ];
        for (kind, w, h) in cases {
            let el = Element::new(kind, 0.0, 0.0);
            assert_eq!((el.w, el.h), (w, h), "wrong size for {:?}", kind);
        }
    }

    #[test]
    fn element_ids_are_unique() {
        let a = Element::new(ElementKind::Wall, 0.0, 0.0);
        let b = Element::new(ElementKind::Wall, 0.0, 0.0);
        assert_ne!(a.id, b.id);
    }

    #[test]
    fn element_label_matches_kind() {
        assert_eq!(Element::new(ElementKind::Wall, 0.0, 0.0).label(), "Wall");
        assert_eq!(Element::new(ElementKind::Room, 0.0, 0.0).label(), "Room");
        assert_eq!(Element::new(ElementKind::Column, 0.0, 0.0).label(), "Column");
        assert_eq!(Element::new(ElementKind::Beam, 0.0, 0.0).label(), "Beam");
    }

    #[test]
    fn material_labels_and_colors_are_distinct() {
        let mats = [
            Material::Concrete,
            Material::Brick,
            Material::Glass,
            Material::Timber,
            Material::Steel,
        ];
        let labels: Vec<_> = mats.iter().map(|m| m.label()).collect();
        assert_eq!(labels, ["Concrete", "Brick", "Glass", "Timber", "Steel"]);
        let mut colors = mats.iter().map(|m| m.color()).collect::<Vec<_>>();
        colors.sort();
        colors.dedup();
        assert_eq!(colors.len(), mats.len(), "material colors must be distinct");
    }

    #[test]
    fn project_new_is_empty_with_name() {
        let p = Project::new("Test");
        assert_eq!(p.name, "Test");
        assert!(p.elements.is_empty());
        assert!(!p.id.is_empty());
    }

    #[test]
    fn default_demo_has_four_elements_with_unique_ids() {
        let p = Project::default_demo();
        assert_eq!(p.name, "Pavilion 01");
        assert_eq!(p.elements.len(), 4);
        let kinds = p.elements.iter().map(|e| e.kind).collect::<Vec<_>>();
        assert!(kinds.contains(&ElementKind::Room));
        assert!(kinds.contains(&ElementKind::Wall));
        assert!(kinds.contains(&ElementKind::Column));
        assert!(kinds.contains(&ElementKind::Beam));
        let mut ids = p.elements.iter().map(|e| e.id.clone()).collect::<Vec<_>>();
        ids.sort();
        ids.dedup();
        assert_eq!(ids.len(), 4);
    }

    #[test]
    fn serde_roundtrip_project() {
        let mut p = Project::new("Roundtrip");
        p.elements.push(Element::new(ElementKind::Room, 1.0, 2.0));
        let s = serde_json::to_string(&vec![p.clone()]).expect("serialize");
        let back: Vec<Project> = serde_json::from_str(&s).expect("deserialize");
        assert_eq!(back.len(), 1);
        assert_eq!(back[0].name, p.name);
        assert_eq!(back[0].elements, p.elements);
    }

    #[test]
    fn load_from_missing_path_returns_demo() {
        let path = temp_file("missing");
        let _ = std::fs::remove_file(&path);
        let v = load_from_path(&path);
        assert_eq!(v.len(), 1);
        assert_eq!(v[0].name, "Pavilion 01");
    }

    #[test]
    fn save_load_roundtrip_via_temp_file() {
        let path = temp_file("roundtrip");
        let mut p = Project::new("Temp");
        p.elements.push(Element::new(ElementKind::Column, 5.0, 6.0));
        let projects = vec![p];
        save_to_path(&projects, &path).expect("save");
        let back = load_from_path(&path);
        assert_eq!(back.len(), 1);
        assert_eq!(back[0].name, "Temp");
        assert_eq!(back[0].elements, projects[0].elements);
        let _ = std::fs::remove_file(&path);
    }
}
