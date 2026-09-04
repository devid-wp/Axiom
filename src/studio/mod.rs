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

#[derive(Clone, Debug, Serialize, Deserialize)]
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

pub fn load_projects() -> Vec<Project> {
    let p = projects_path();
    if let Ok(s) = fs::read_to_string(&p) {
        if let Ok(v) = serde_json::from_str(&s) { return v; }
    }
    vec![Project::default_demo()]
}

pub fn save_projects(projects: &[Project]) {
    let p = projects_path();
    if let Ok(s) = serde_json::to_string_pretty(projects) {
        let _ = fs::write(p, s);
    }
}
