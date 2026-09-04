use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
pub struct Course {
    pub id: String,
    pub title_en: String,
    pub title_ru: String,
    pub desc_en: String,
    pub desc_ru: String,
    pub level: String,
    pub accent: String,
    pub image: String,
    pub lessons: Vec<Lesson>,
}
#[derive(Clone, Serialize, Deserialize)]
pub struct Lesson {
    pub id: String,
    pub title_en: String,
    pub title_ru: String,
    pub duration: String,
    pub content_en: Vec<String>,
    pub content_ru: Vec<String>,
    pub quiz_q_en: String,
    pub quiz_q_ru: String,
    pub quiz_opts_en: Vec<String>,
    pub quiz_opts_ru: Vec<String>,
    pub quiz_correct: usize,
}

#[derive(Clone)]
pub struct Topic {
    pub id: &'static str,
    pub category: &'static str,
    pub title_en: &'static str,
    pub title_ru: &'static str,
    pub desc_en: &'static str,
    pub desc_ru: &'static str,
    pub read_time: &'static str,
    pub level: &'static str,
    pub image: &'static str,
}

pub fn courses() -> Vec<Course> {
    vec![
        Course { id:"fundamentals".into(), title_en:"Fundamentals of Architecture".into(), title_ru:"Основы архитектуры".into(), desc_en:"Space, order, light and human scale.".into(), desc_ru:"Пространство, порядок, свет и масштаб.".into(), level:"Beginner • 4 lessons".into(), accent:"#7C5CFC".into(), image:"◐".into(), lessons: vec![
            Lesson { id:"f1".into(), title_en:"What is Architecture?".into(), title_ru:"Что такое архитектура?".into(), duration:"8 min".into(), content_en: vec!["Vitruvius: firmitas, utilitas, venustas.".into(), "We shape space to shape behavior.".into()], content_ru: vec!["Витрувий: firmitas, utilitas, venustas.".into(), "Мы формируем пространство.".into()], quiz_q_en:"Vitruvian triad includes:".into(), quiz_q_ru:"Триада Витрувия:".into(), quiz_opts_en: vec!["Firmitas, Utilitas, Venustas".into(), "Steel, Glass, Concrete".into()], quiz_opts_ru: vec!["Firmitas, Utilitas, Venustas".into(), "Сталь, Стекло, Бетон".into()], quiz_correct:0 },
            Lesson { id:"f2".into(), title_en:"Order & Proportion".into(), title_ru:"Порядок и пропорции".into(), duration:"10 min".into(), content_en: vec!["Proportion creates harmony.".into()], content_ru: vec!["Пропорция создаёт гармонию.".into()], quiz_q_en:"Regulating lines by:".into(), quiz_q_ru:"Регулирующие линии:".into(), quiz_opts_en: vec!["Le Corbusier".into(), "Mies".into()], quiz_opts_ru: vec!["Ле Корбюзье".into(), "Мис".into()], quiz_correct:0 },
            Lesson { id:"f3".into(), title_en:"Light & Material".into(), title_ru:"Свет и материал".into(), duration:"9 min".into(), content_en: vec!["Light reveals material.".into()], content_ru: vec!["Свет выявляет материал.".into()], quiz_q_en:"Author:".into(), quiz_q_ru:"Автор:".into(), quiz_opts_en: vec!["Louis Kahn".into(), "Tadao Ando".into()], quiz_opts_ru: vec!["Луис Кан".into(), "Тадао Андо".into()], quiz_correct:0 },
            Lesson { id:"f4".into(), title_en:"Human Scale".into(), title_ru:"Человеческий масштаб".into(), duration:"7 min".into(), content_en: vec!["Doors 2100mm recall our body.".into()], content_ru: vec!["Двери 2100 мм.".into()], quiz_q_en:"Riser approx:".into(), quiz_q_ru:"Подступенок:".into(), quiz_opts_en: vec!["150–170 mm".into(), "220 mm".into()], quiz_opts_ru: vec!["150–170 мм".into(), "220 мм".into()], quiz_correct:0 },
        ]},
        Course { id:"structures".into(), title_en:"Structures that Stand".into(), title_ru:"Конструкции, которые стоят".into(), desc_en:"Beams, arches, trusses and frames.".into(), desc_ru:"Балки, арки, фермы и рамы.".into(), level:"Beginner • 4 lessons".into(), accent:"#9D7CFF".into(), image:"⬢".into(), lessons: vec![
            Lesson { id:"s1".into(), title_en:"Loads & Paths".into(), title_ru:"Нагрузки и пути".into(), duration:"9 min".into(), content_en: vec!["Every building resolves ΣF=0.".into()], content_ru: vec!["Каждое здание решает ΣF=0.".into()], quiz_q_en:"Load path ends at:".into(), quiz_q_ru:"Путь заканчивается:".into(), quiz_opts_en: vec!["Soil".into(), "Roof".into()], quiz_opts_ru: vec!["Грунт".into(), "Крыша".into()], quiz_correct:0 },
            Lesson { id:"s2".into(), title_en:"Beams & Bending".into(), title_ru:"Балки и изгиб".into(), duration:"11 min".into(), content_en: vec!["Beam bends.".into()], content_ru: vec!["Балка изгибается.".into()], quiz_q_en:"I-beam efficient because:".into(), quiz_q_ru:"Двутавр эффективен:".into(), quiz_opts_en: vec!["Far from neutral axis".into(), "Heavier".into()], quiz_opts_ru: vec!["От нейтрали".into(), "Тяжелее".into()], quiz_correct:0 },
            Lesson { id:"s3".into(), title_en:"Arches & Cables".into(), title_ru:"Арки и ванты".into(), duration:"8 min".into(), content_en: vec!["Arch = inverted catenary.".into()], content_ru: vec!["Арка = цепная линия.".into()], quiz_q_en:"Ideal arch:".into(), quiz_q_ru:"Идеальная арка:".into(), quiz_opts_en: vec!["Inverted catenary".into(), "Semicircle".into()], quiz_opts_ru: vec!["Цепная линия".into(), "Полукруг".into()], quiz_correct:0 },
            Lesson { id:"s4".into(), title_en:"Frames & Stability".into(), title_ru:"Рамы".into(), duration:"10 min".into(), content_en: vec!["Rigid frame.".into()], content_ru: vec!["Жёсткая рама.".into()], quiz_q_en:"Triangulation gives:".into(), quiz_q_ru:"Триангуляция:".into(), quiz_opts_en: vec!["Rigidity".into(), "Glass".into()], quiz_opts_ru: vec!["Жёсткость".into(), "Стекло".into()], quiz_correct:0 },
        ]},
        Course { id:"materials".into(), title_en:"Materials & Tectonics".into(), title_ru:"Материалы".into(), desc_en:"Concrete, steel, timber.".into(), desc_ru:"Бетон, сталь, дерево.".into(), level:"Intermediate • 3 lessons".into(), accent:"#B794FF".into(), image:"▭".into(), lessons: vec![
            Lesson { id:"m1".into(), title_en:"Concrete".into(), title_ru:"Бетон".into(), duration:"8 min".into(), content_en: vec!["w/c determines strength.".into()], content_ru: vec!["В/Ц определяет прочность.".into()], quiz_q_en:"Lower w/c:".into(), quiz_q_ru:"Меньше В/Ц:".into(), quiz_opts_en: vec!["Higher strength".into(), "Workability".into()], quiz_opts_ru: vec!["Прочнее".into(), "Подвижнее".into()], quiz_correct:0 },
            Lesson { id:"m2".into(), title_en:"Steel & Joints".into(), title_ru:"Сталь".into(), duration:"9 min".into(), content_en: vec!["Steel ductile.".into()], content_ru: vec!["Сталь пластична.".into()], quiz_q_en:"Steel critical ~".into(), quiz_q_ru:"Критич. ~".into(), quiz_opts_en: vec!["550°C".into(), "100°C".into()], quiz_opts_ru: vec!["550°C".into(), "100°C".into()], quiz_correct:0 },
            Lesson { id:"m3".into(), title_en:"Timber Futures".into(), title_ru:"Дерево".into(), duration:"7 min".into(), content_en: vec!["CLT towers.".into()], content_ru: vec!["CLT башни.".into()], quiz_q_en:"CLT:".into(), quiz_q_ru:"CLT:".into(), quiz_opts_en: vec!["Cross-Laminated Timber".into(), "Concrete".into()], quiz_opts_ru: vec!["Cross-Laminated Timber".into(), "Бетон".into()], quiz_correct:0 },
        ]},
        Course { id:"styles".into(), title_en:"Styles Through Time".into(), title_ru:"Стили".into(), desc_en:"Doric to Deconstructivism.".into(), desc_ru:"Дорика до деконструктивизма.".into(), level:"Beginner • 3 lessons".into(), accent:"#7C5CFC".into(), image:"⬣".into(), lessons: vec![
            Lesson { id:"t1".into(), title_en:"Classical Orders".into(), title_ru:"Ордера".into(), duration:"7 min".into(), content_en: vec!["Doric, Ionic, Corinthian.".into()], content_ru: vec!["Дорика, ионика.".into()], quiz_q_en:"Most ornate:".into(), quiz_q_ru:"Декоративный:".into(), quiz_opts_en: vec!["Corinthian".into(), "Doric".into()], quiz_opts_ru: vec!["Коринфский".into(), "Дорический".into()], quiz_correct:0 },
            Lesson { id:"t2".into(), title_en:"Modernism".into(), title_ru:"Модернизм".into(), duration:"8 min".into(), content_en: vec!["Form follows function.".into()], content_ru: vec!["Форма следует функции.".into()], quiz_q_en:"Five points:".into(), quiz_q_ru:"Пять пунктов:".into(), quiz_opts_en: vec!["Le Corbusier".into(), "Wright".into()], quiz_opts_ru: vec!["Ле Корбюзье".into(), "Райт".into()], quiz_correct:0 },
            Lesson { id:"t3".into(), title_en:"Contemporary".into(), title_ru:"Современность".into(), duration:"7 min".into(), content_en: vec!["Parametricism.".into()], content_ru: vec!["Параметризм.".into()], quiz_q_en:"Parametric uses:".into(), quiz_q_ru:"Параметрика:".into(), quiz_opts_en: vec!["Algorithms".into(), "Hand drawing".into()], quiz_opts_ru: vec!["Алгоритмы".into(), "Ручная".into()], quiz_correct:0 },
        ]},
    ]
}

pub fn topics() -> Vec<Topic> {
    vec![
        Topic { id:"gothic", category:"styles", title_en:"Gothic — Light as Structure", title_ru:"Готика — свет как конструкция", desc_en:"Pointed arches, ribbed vaults.", desc_ru:"Стрельчатые арки, своды.", read_time:"6 min", level:"Beginner", image:"⛪" },
        Topic { id:"brutalism", category:"styles", title_en:"Brutalism — Truth of Material", title_ru:"Брутализм", desc_en:"Raw concrete, mass and shadow.", desc_ru:"Бетон, масса и тень.", read_time:"5 min", level:"Beginner", image:"🏢" },
        Topic { id:"truss", category:"structures", title_en:"Trusses — Triangles that Span", title_ru:"Фермы", desc_en:"Triangles are rigid.", desc_ru:"Треугольник жёсток.", read_time:"8 min", level:"Beginner", image:"🔷" },
        Topic { id:"arch", category:"structures", title_en:"Arches & Vaults", title_ru:"Арки", desc_en:"Compression-only forms.", desc_ru:"Только сжатие.", read_time:"6 min", level:"Beginner", image:"🌉" },
        Topic { id:"concrete", category:"materials", title_en:"Concrete — Liquid Stone", title_ru:"Бетон", desc_en:"Aggregate, cement, water.", desc_ru:"Заполнитель, цемент.", read_time:"7 min", level:"Beginner", image:"🧱" },
        Topic { id:"steel", category:"materials", title_en:"Steel — Tensile Grace", title_ru:"Сталь", desc_en:"Ductility, yield.", desc_ru:"Пластичность.", read_time:"5 min", level:"Intermediate", image:"🏗️" },
        Topic { id:"wood", category:"materials", title_en:"Timber — Warmth", title_ru:"Дерево", desc_en:"Grain, moisture.", desc_ru:"Волокна.", read_time:"6 min", level:"Beginner", image:"🪵" },
        Topic { id:"loads", category:"engineering", title_en:"Loads & Equilibrium", title_ru:"Нагрузки", desc_en:"Dead, live, wind.", desc_ru:"Постоянные, ветровые.", read_time:"8 min", level:"Beginner", image:"⚖️" },
        Topic { id:"beams", category:"engineering", title_en:"Beams — Bending", title_ru:"Балки", desc_en:"Moment, shear.", desc_ru:"Момент, срез.", read_time:"9 min", level:"Intermediate", image:"📐" },
    ]
}
