/* AXIOM — course/lesson content. Port of src/data.rs (bilingual) with the
   lesson body text the Slint reader displayed. Bilingual for the EN/RU toggle. */

export interface LessonBody {
  en: string[];
  ru: string[];
}

export interface Quiz {
  q: { en: string; ru: string };
  opts: { en: string[]; ru: string[] };
  correct: number;
}

export interface Lesson {
  id: string;
  title: { en: string; ru: string };
  duration: string;
  level: string;
  body: LessonBody;
  quiz: Quiz;
}

export interface Course {
  id: string;
  title: { en: string; ru: string };
  meta: { en: string; ru: string };
  level: string;
  accent: string;
  lessons: Lesson[];
}

export interface Topic {
  id: string;
  category: "styles" | "structures" | "materials" | "engineering";
  title: { en: string; ru: string };
  desc: { en: string; ru: string };
  read_time: string;
  level: string;
}

const L = (
  id: string,
  en: string,
  ru: string,
  duration: string,
  level: string,
  bodyEn: string[],
  bodyRu: string[],
  quizQ: { en: string; ru: string },
  optsEn: string[],
  optsRu: string[],
  correct = 0
): Lesson => ({
  id,
  title: { en, ru },
  duration,
  level,
  body: { en: bodyEn, ru: bodyRu },
  quiz: { q: quizQ, opts: { en: optsEn, ru: optsRu }, correct },
});

export const courses: Course[] = [
  {
    id: "fundamentals",
    title: { en: "Fundamentals of Architecture", ru: "Основы архитектуры" },
    meta: { en: "beginner · 4", ru: "начальный · 4" },
    level: "beginner",
    accent: "#7C5CFC",
    lessons: [
      L(
        "f1", "What is Architecture?", "Что такое архитектура?", "8 min", "beginner",
        [
          "Vitruvius: firmitas, utilitas, venustas — strength, utility, delight.",
          "We shape space to shape behavior: walls direct movement, openings frame light.",
        ],
        ["Витрувий: firmitas, utilitas, venustas.", "Мы формируем пространство, чтобы формировать поведение."],
        { en: "The Vitruvian triad includes:", ru: "Триада Витрувия включает:" },
        ["Firmitas, Utilitas, Venustas", "Steel, Glass, Concrete"],
        ["Firmitas, Utilitas, Venustas", "Сталь, Стекло, Бетон"],
        0
      ),
      L(
        "f2", "Order & Proportion", "Порядок и пропорции", "10 min", "beginner",
        [
          "Proportion creates harmony: regulating lines lock parts into one system.",
          "Le Corbusier's Modulor ties building dimensions to the human body.",
        ],
        ["Пропорция создаёт гармонию.", "Модулор Ле Корбюзье связывает размеры здания с телом человека."],
        { en: "Regulating lines, canonically:", ru: "Регулирующие линии:" },
        ["Le Corbusier", "Mies van der Rohe"],
        ["Ле Корбюзье", "Мис ван дер Роэ"],
        0
      ),
      L(
        "f3", "Light & Material", "Свет и материал", "9 min", "beginner",
        [
          "Light reveals material: the same concrete reads differently at noon and dusk.",
          "Kahn: plan for how a room receives the sun before choosing its finish.",
        ],
        ["Свет выявляет материал.", "Кан: проектируйте то, как комната принимает солнце."],
        { en: "Author of the light-first approach:", ru: "Автор светового подхода:" },
        ["Louis Kahn", "Tadao Ando"],
        ["Луис Кан", "Тадао Андо"],
        0
      ),
      L(
        "f4", "Human Scale", "Человеческий масштаб", "7 min", "beginner",
        [
          "Doors at 2100 mm recall our body; steps at 150–170 mm risers fit our stride.",
          "Every dimension in your plan is a decision about a human action.",
        ],
        ["Двери 2100 мм напоминают о теле.", "Каждая величина в плане — решение о действии человека."],
        { en: "Stair riser, approximately:", ru: "Подступенок лестницы:" },
        ["150–170 mm", "220 mm"],
        ["150–170 мм", "220 мм"],
        0
      ),
    ],
  },
  {
    id: "structures",
    title: { en: "Structures that Stand", ru: "Конструкции, которые стоят" },
    meta: { en: "beginner · 4", ru: "начальный · 4" },
    level: "beginner",
    accent: "#9D7CFF",
    lessons: [
      L(
        "s1", "Loads & Paths", "Нагрузки и пути", "9 min", "beginner",
        [
          "Every building resolves ΣF = 0: loads travel slab → beam → column → soil.",
          "Draw the load path before you draw the plan.",
        ],
        ["Каждое здание решает ΣF=0.", "Нарисуйте путь нагрузки до плана."],
        { en: "The load path ends at:", ru: "Путь нагрузки заканчивается:" },
        ["Soil", "Roof"],
        ["Грунт", "Крыша"],
        0
      ),
      L(
        "s2", "Beams & Bending", "Балки и изгиб", "11 min", "beginner",
        [
          "A beam bends: top fibers compress, bottom fibers stretch, middle idles.",
          "The I-beam puts steel far from the neutral axis — maximum stiffness, minimum mass.",
        ],
        ["Балка изгибается.", "Двутавр ставит сталь далеко от нейтральной оси."],
        { en: "I-beam is efficient because material sits:", ru: "Двутавр эффективен, потому что материал:" },
        ["Far from neutral axis", "Heavier is better"],
        ["Далеко от нейтрали", "Тяжелее — лучше"],
        0
      ),
      L(
        "s3", "Arches & Cables", "Арки и ванты", "8 min", "beginner",
        [
          "An arch is an inverted catenary: pure compression, no bending.",
          "Flip it and you get a cable — pure tension. Same curve, opposite force.",
        ],
        ["Арка — перевёрнутая цепная линия.", "Переверните — получится трос."],
        { en: "The ideal arch follows:", ru: "Идеальная арка следует:" },
        ["Inverted catenary", "Semicircle"],
        ["Цепной линии", "Полукругу"],
        0
      ),
      L(
        "s4", "Frames & Stability", "Рамы", "10 min", "beginner",
        [
          "Rigid frames resist sway through fixed joints; braced frames through triangulation.",
          "A triangle is the only inherently rigid polygon — use it.",
        ],
        ["Жёсткая рама сопротивляется сдвигу.", "Треугольник — единственный жёсткий многоугольник."],
        { en: "Triangulation gives a frame:", ru: "Триангуляция даёт раме:" },
        ["Rigidity", "More glass"],
        ["Жёсткость", "Больше стекла"],
        0
      ),
    ],
  },
  {
    id: "materials",
    title: { en: "Materials & Tectonics", ru: "Материалы" },
    meta: { en: "intermediate · 3", ru: "средний · 3" },
    level: "intermediate",
    accent: "#B794FF",
    lessons: [
      L(
        "m1", "Concrete", "Бетон", "8 min", "intermediate",
        [
          "Water/cement ratio determines strength: less water, denser stone.",
          "Cure it wet, load it late — concrete rewards patience.",
        ],
        ["В/Ц отношение определяет прочность.", "Бетон награждает терпение."],
        { en: "Lower w/c ratio means:", ru: "Меньше В/Ц означает:" },
        ["Higher strength", "Better workability"],
        ["Более прочный", "Более подвижный"],
        0
      ),
      L(
        "m2", "Steel & Joints", "Сталь", "9 min", "intermediate",
        [
          "Steel is ductile: it yields visibly before it fails — a built-in warning.",
          "But it softens near 550 °C: fire protection is structural design.",
        ],
        ["Сталь пластична.", "Она ослабевает около 550 °C."],
        { en: "Unprotected steel is critical near:", ru: "Незащищённая сталь критична при:" },
        ["550 °C", "100 °C"],
        ["550 °C", "100 °C"],
        0
      ),
      L(
        "m3", "Timber Futures", "Дерево", "7 min", "intermediate",
        [
          "Cross-laminated timber stacks strength like plywood — towers in wood.",
          "Grain direction is the whole game: strong along, weak across.",
        ],
        ["CLT башни.", "Направление волокон — всё."],
        { en: "CLT stands for:", ru: "CLT означает:" },
        ["Cross-Laminated Timber", "Concrete, Light Type"],
        ["Cross-Laminated Timber", "Бетон, лёгкий тип"],
        0
      ),
    ],
  },
  {
    id: "styles",
    title: { en: "Styles Through Time", ru: "Стили" },
    meta: { en: "beginner · 3", ru: "начальный · 3" },
    level: "beginner",
    accent: "#7C5CFC",
    lessons: [
      L(
        "t1", "Classical Orders", "Ордера", "7 min", "beginner",
        [
          "Doric, Ionic, Corinthian: a complete grammar of base, shaft, capital.",
          "The most ornate order carries the lightest loads — ornament as signal.",
        ],
        ["Дорика, ионика, коринфский.", "Самый орнаментированный ордер несёт лёгкие нагрузки."],
        { en: "Most ornate order:", ru: "Самый декоративный ордер:" },
        ["Corinthian", "Doric"],
        ["Коринфский", "Дорический"],
        0
      ),
      L(
        "t2", "Modernism", "Модернизм", "8 min", "beginner",
        [
          "Form follows function: strip the ornament, expose the system.",
          "Le Corbusier's five points — pilotis, free plan, free facade, ribbon windows, roof garden.",
        ],
        ["Форма следует функции.", "Пять пунктов Ле Корбюзье."],
        { en: "The five points belong to:", ru: "Пять пунктов принадлежат:" },
        ["Le Corbusier", "F. L. Wright"],
        ["Ле Корбюзье", "Ф. Л. Райт"],
        0
      ),
      L(
        "t3", "Contemporary", "Современность", "7 min", "beginner",
        [
          "Parametricism: form computed from rules, constraints, and data.",
          "The algorithm is the drawing — parameters are the design decisions.",
        ],
        ["Параметризм.", "Алгоритм и есть чертёж."],
        { en: "Parametric design is driven by:", ru: "Параметрический дизайн управляется:" },
        ["Algorithms", "Hand drawing"],
        ["Алгоритмами", "Ручным рисунком"],
        0
      ),
    ],
  },
];

export function totalLessons(): number {
  return courses.reduce((acc, c) => acc + c.lessons.length, 0);
}

export const topics: Topic[] = [
  { id: "gothic", category: "styles", title: { en: "Gothic — Light as Structure", ru: "Готика — свет как конструкция" }, desc: { en: "Pointed arches, ribbed vaults.", ru: "Стрельчатые арки, своды." }, read_time: "6 min", level: "beginner" },
  { id: "brutalism", category: "styles", title: { en: "Brutalism — Truth of Material", ru: "Брутализм" }, desc: { en: "Raw concrete, mass and shadow.", ru: "Бетон, масса и тень." }, read_time: "5 min", level: "beginner" },
  { id: "truss", category: "structures", title: { en: "Trusses — Triangles that Span", ru: "Фермы" }, desc: { en: "Triangles are rigid.", ru: "Треугольник жёсток." }, read_time: "8 min", level: "beginner" },
  { id: "arch", category: "structures", title: { en: "Arches & Vaults", ru: "Арки" }, desc: { en: "Compression-only forms.", ru: "Только сжатие." }, read_time: "6 min", level: "beginner" },
  { id: "concrete", category: "materials", title: { en: "Concrete — Liquid Stone", ru: "Бетон" }, desc: { en: "Aggregate, cement, water.", ru: "Заполнитель, цемент." }, read_time: "7 min", level: "beginner" },
  { id: "steel", category: "materials", title: { en: "Steel — Tensile Grace", ru: "Сталь" }, desc: { en: "Ductility, yield.", ru: "Пластичность." }, read_time: "5 min", level: "intermediate" },
  { id: "wood", category: "materials", title: { en: "Timber — Warmth", ru: "Дерево" }, desc: { en: "Grain, moisture.", ru: "Волокна." }, read_time: "6 min", level: "beginner" },
  { id: "loads", category: "engineering", title: { en: "Loads & Equilibrium", ru: "Нагрузки" }, desc: { en: "Dead, live, wind.", ru: "Постоянные, ветровые." }, read_time: "8 min", level: "beginner" },
  { id: "beams", category: "engineering", title: { en: "Beams — Bending", ru: "Балки" }, desc: { en: "Moment, shear.", ru: "Момент, срез." }, read_time: "9 min", level: "intermediate" },
];

/* topic category -> study course index (where Explore rows land) */
export const categoryToCourse: Record<string, number> = {
  styles: 3,
  structures: 1,
  materials: 2,
  engineering: 1,
};

export interface ExploreEntryData {
  title: string;
  text: string;
  dot: string;
}

export interface ExploreEntry {
  id: string;
  accent: string;
  lesson: number;
  data: { en: ExploreEntryData; ru: ExploreEntryData };
}

export interface ExploreCategory {
  id: string;
  meta: { en: string; ru: string };
  entries: ExploreEntry[];
}

/* Explore index rows — built from topics, each landing on a course lesson. */
const ACCENT: Record<string, string> = {
  gothic: "#7C5CFC",
  brutalism: "#B794FF",
  truss: "#9D7CFF",
  arch: "#7C5CFC",
  concrete: "#B794FF",
  steel: "#9D7CFF",
  wood: "#7C5CFC",
  loads: "#9D7CFF",
  beams: "#7C5CFC",
};

const ENTRY_LESSON: Record<string, number> = {
  gothic: 0,
  brutalism: 2,
  truss: 3,
  arch: 2,
  concrete: 0,
  steel: 1,
  wood: 2,
  loads: 0,
  beams: 1,
};

function entry(t: Topic): ExploreEntry {
  const lesson = ENTRY_LESSON[t.id] ?? 0;
  return {
    id: t.id,
    accent: ACCENT[t.id] ?? "#7C5CFC",
    lesson,
    data: {
      en: { title: t.title.en, text: t.desc.en, dot: ACCENT[t.id] ?? "#7C5CFC" },
      ru: { title: t.title.ru, text: t.desc.ru, dot: ACCENT[t.id] ?? "#7C5CFC" },
    },
  };
}

export const categories: ExploreCategory[] = [
  {
    id: "styles",
    meta: { en: "styles through time · 2", ru: "стили · 2" },
    entries: topics.filter((t) => t.category === "styles").map(entry),
  },
  {
    id: "structures",
    meta: { en: "structures that stand · 2", ru: "конструкции · 2" },
    entries: topics.filter((t) => t.category === "structures").map(entry),
  },
  {
    id: "materials",
    meta: { en: "materials & tectonics · 3", ru: "материалы · 3" },
    entries: topics.filter((t) => t.category === "materials").map(entry),
  },
  {
    id: "engineering",
    meta: { en: "engineering in practice · 2", ru: "инженерия · 2" },
    entries: topics.filter((t) => t.category === "engineering").map(entry),
  },
];