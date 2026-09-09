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
          "Vitruvius: firmitas, utilitas, venustas — strength, utility, delight. These three principles have guided building for two thousand years. Every wall, every window, every column must serve at least one of them.",
          "We shape space to shape behavior: walls direct movement, openings frame light, proportions set the mood. Architecture is not decoration — it is the choreography of human experience through built form.",
          "A building is a machine for living (Le Corbusier), a shelter that inspires (Wright), and a mirror of society (Rudofsky). Architecture is where art meets physics meets daily life.",
          "The architect's first tool is not a pencil but a question: what happens to the person who enters this space? Every design decision — height, material, light — answers that question.",
        ],
        [
          "Витрувий: firmitas, utilitas, venustas — прочность, польза, красота. Эти три принципа направляют строительство две тысячи лет.",
          "Мы формируем пространство, чтобы формировать поведение: стены направляют движение, проёмы рамируют свет, пропорции задают настроение.",
          "Здание — машина для жизни (Ле Корбюзье), укрытие, вдохновляющее (Райт), и зеркало общества (Рудофски).",
          "Первый инструмент архитектора — не карандаш, а вопрос: что происходит с человеком, который входит в это пространство?",
        ],
        { en: "The Vitruvian triad includes:", ru: "Триада Витрувия включает:" },
        ["Firmitas, Utilitas, Venustas", "Steel, Glass, Concrete"],
        ["Firmitas, Utilitas, Venustas", "Сталь, Стекло, Бетон"],
        0
      ),
      L(
        "f2", "Order & Proportion", "Порядок и пропорции", "10 min", "beginner",
        [
          "Proportion creates harmony: regulating lines lock parts into one system. The Golden Ratio (1:1.618) appears in the Parthenon's facade, in tree branching, in spiral galaxies. Architecture borrows nature's mathematics.",
          "Le Corbusier's Modulor ties building dimensions to the human body: a 183 cm man raises his hand to 226 cm, creating a proportional system for every element from door handles to ceilings.",
          "The module is the DNA of a building. Choose it wisely — it cascades through every room, every joint, every detail. A bad module makes every decision harder.",
          "Symmetry gives order; asymmetry gives dynamism. Both are tools, not rules. The Pantheon is symmetrical; Tokyo's houses are beautifully asymmetric.",
        ],
        [
          "Пропорция создаёт гармонию: регулирующие линии связывают части в одну систему. Золотое сечение (1:1,618) появляется во фронтоне Парфенона.",
          "Модулор Ле Корбюзье связывает размеры здания с телом человека: мужчина 183 см поднимает руку на 226 см, создавая пропорциональную систему.",
          "Модуль — это ДНК здания. Выберите его мудро — он каскадирует через каждую комнату, каждый стык, каждую деталь.",
          "Симметрия даёт порядок; асимметрия — динамику. Оба — инструменты, а не правила.",
        ],
        { en: "Regulating lines, canonically:", ru: "Регулирующие линии:" },
        ["Le Corbusier", "Mies van der Rohe"],
        ["Ле Корбюзье", "Мис ван дер Роэ"],
        0
      ),
      L(
        "f3", "Light & Material", "Свет и материал", "9 min", "beginner",
        [
          "Light reveals material: the same concrete reads differently at noon and dusk. Rough surfaces catch shadows; smooth ones bounce light. Every material has a light personality.",
          "Kahn: plan for how a room receives the sun before choosing its finish. The window is not just an opening — it is a light instrument. Its height, width, and orientation sculpt the interior.",
          "North light is steady and cool (ideal for studios); south light is dramatic and warm (ideal for living spaces). East and west light changes hourly, casting long shadows at dawn and dusk.",
          "Consider the sequence: bright exterior → shaded threshold → dim interior. This compression and release of light is architecture's oldest trick for creating drama and welcome.",
        ],
        [
          "Свет выявляет материал: тот же бетон читается иначе в полдень и на закате. Шероховатые поверхности ловят тени; гладкие — отражают свет.",
          "Кан: проектируйте то, как комната принимает солнце, до выбора отделки. Окно — не просто проём, а световой инструмент.",
          "Северный свет ровный и холодный (идеально для студий); южный — драматичный и тёплый (идеально для жилых пространств).",
          "Последовательность: яркий экстерьер → затенённый порог → затемнённый интерьер. Это сжатие иrelease света — oldest trick архитектуры.",
        ],
        { en: "Author of the light-first approach:", ru: "Автор светового подхода:" },
        ["Louis Kahn", "Tadao Ando"],
        ["Луис Кан", "Тадао Андо"],
        0
      ),
      L(
        "f4", "Human Scale", "Человеческий масштаб", "7 min", "beginner",
        [
          "Doors at 2100 mm recall our body; steps at 150–170 mm risers fit our stride. Every dimension in your plan is a decision about a human action. Architecture is anthropology made physical.",
          "A ceiling at 2400 mm feels intimate; at 3600 mm it feels grand; at 6000 mm it feels sacred. Height is emotion in concrete and steel.",
          "The handrail at 900 mm, the counter at 900 mm, the table at 750 mm — these are not arbitrary numbers but the geometry of the human body in action.",
          "When dimensions ignore the body, people feel it: a too-tall door feels cold, a too-low beam feels oppressive. Good architecture fits like a well-made glove.",
        ],
        [
          "Двери 2100 мм напоминают о теле; ступени 150–170 мм подходят под шаг. Каждая величина в плане — решение о действии человека.",
          "Потолок 2400 мм кажется интимным; 3600 мм — величественным; 6000 мм — священным. Высота — это эмоция в бетоне и стали.",
          "Поручень 900 мм, стойка 900 мм, стол 750 мм — это не произвольные числа, а геометрия тела человека в действии.",
          "Когда размеры игнорируют тело, люди это чувствуют: слишком высокая дверь кажется холодной, слишком низкий потолок — давящим.",
        ],
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
          "Every building resolves ΣF = 0: loads travel slab → beam → column → soil. This is the load path — the invisible thread that connects every element to the earth.",
          "Draw the load path before you draw the plan. If you cannot trace a continuous line from every surface to the ground, the structure will find a crack to fail through.",
          "Dead loads (self-weight) are constant; live loads (people, furniture) move; lateral loads (wind, seismic) push sideways. Each requires a different structural response.",
          "A column is a load path in miniature: it concentrates force into a point. A wall spreads it along a line. A mat spreads it across an area. Choose the right one for your soil.",
        ],
        [
          "Каждое здание решает ΣF=0: нагрузки идут плита → балка → колонна → грунт. Это путь нагрузки — невидимая нить, связывающая каждый элемент с землёй.",
          "Нарисуйте путь нагрузки до плана. Если вы не можете провести непрерывную линию от каждой поверхности до земли, структура найдёт трещину.",
          "Постоянные нагрузки (собственный вес) постоянны; временные (люди, мебель) двигаются; горизонтальные (ветер, сейсмика) толкают вбок.",
          "Колонна — путь нагрузки в миниатюре: она концентрирует силу в точке. Стена распределяет её по линии. Плита — по площади.",
        ],
        { en: "The load path ends at:", ru: "Путь нагрузки заканчивается:" },
        ["Soil", "Roof"],
        ["Грунт", "Крыша"],
        0
      ),
      L(
        "s2", "Beams & Bending", "Балки и изгиб", "11 min", "beginner",
        [
          "A beam bends: top fibers compress, bottom fibers stretch, middle idles (the neutral axis). This internal tension-compression couple is what gives the beam its strength.",
          "The I-beam puts steel far from the neutral axis — maximum stiffness, minimum mass. It is the most efficient shape for bending resistance in one direction.",
          "Depth matters more than width: doubling the depth quadruples the bending resistance. That is why a deep beam spans farther than a wide one.",
          "Materials matter: concrete beams need steel reinforcement for tension (concrete is weak in tension). Timber beams work well for short spans. Steel I-beams are the go-to for long spans.",
        ],
        [
          "Балка изгибается: верхние волокна сжимаются, нижние растягиваются, середина бездействует (нейтральная ось). Эта пара сжатие-растяжение и даёт балке прочность.",
          "Двутавр ставит сталь далеко от нейтральной оси — максимальная жёсткость, минимальная масса. Это самая эффективная форма для сопротивления изгибу.",
          "Глубина важнее ширины: удвоение глубины увеличивает сопротивление изгибу в четыре раза. Поэтому глубокая балка перекрывает бо́льший пролёт.",
          "Материалы важны: бетонные балки нуждаются в стальной арматуре. Деревянные хороши для коротких пролётов. Стальные двутавровые — для длинных.",
        ],
        { en: "I-beam is efficient because material sits:", ru: "Двутавр эффективен, потому что материал:" },
        ["Far from neutral axis", "Heavier is better"],
        ["Далеко от нейтрали", "Тяжелее — лучше"],
        0
      ),
      L(
        "s3", "Arches & Cables", "Арки и ванты", "8 min", "beginner",
        [
          "An arch is an inverted catenary: pure compression, no bending. The shape naturally resolves gravity into compressive forces along its curve.",
          "Flip it and you get a cable — pure tension. Same curve, opposite force. This is why suspension bridges use cables: they carry load in pure tension, the most efficient material use.",
          "The key to an arch is the thrust: it pushes outward at the base. Without proper abutments or ties, the arch will spread and collapse. Every arch needs something to push against.",
          "Roman arches used voussoirs (wedge-shaped stones); Gothic arches used pointed shapes to reduce thrust; modern arches use reinforced concrete or steel for spanning vast distances.",
        ],
        [
          "Арка — перевёрнутая цепная линия: чистое сжатие, без изгиба. Форма естественно превращает гравитацию в сжимающие силы вдоль кривой.",
          "Переверните — получится трос: чистое растяжение. Та же кривая, противоположная сила. Поэтому подвесные мосты используют тросы.",
          "Ключ к арке — горизонтальное распор: она давит наружу у основания. Безproper опор арка разойдётся и рухнет.",
          "Римские арки использовали клинья (voussoirs); готические — стрельчатые формы для уменьшения распора; современные — ж/б или сталь.",
        ],
        { en: "The ideal arch follows:", ru: "Идеальная арка следует:" },
        ["Inverted catenary", "Semicircle"],
        ["Цепной линии", "Полукругу"],
        0
      ),
      L(
        "s4", "Frames & Stability", "Рамы", "10 min", "beginner",
        [
          "Rigid frames resist sway through fixed joints; braced frames through triangulation. The choice depends on the load magnitude and the architectural expression you want.",
          "A triangle is the only inherently rigid polygon — use it. Add one diagonal to a rectangle and it becomes rigid. This is the principle behind trusses, bracing, and geodesic domes.",
          "Moment frames use stiff beam-column connections to resist lateral forces. They allow open floor plans but require heavier members. Think of a tree: the trunk bends but does not fall.",
          "Braced frames use diagonal members in shear walls or X-patterns. They are more efficient but visually interrupt the facade. In tall buildings, they are often hidden in service cores.",
        ],
        [
          "Жёсткая рама сопротивляется сдвигу через жёсткие узлы; раскосная рама — через триангуляцию. Выбор зависит от величины нагрузки.",
          "Треугольник — единственный жёсткий многоугольник. Добавьте один диагональ к прямоугольнику — и он станет жёстким. Это принцип ферм, раскосов и геодезических куполов.",
          "Рамные системы используют жёсткие соединения балка-колонна. Они позволяют открытые планы, но требуют более тяжёлых элементов.",
          "Раскосные системы используют диагональные элементы. Они более эффективные, но визуально прерывают фасад. В высотных зданиях их часто прячут в сервисных ядрах.",
        ],
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
          "Water/cement ratio determines strength: less water, denser stone. A typical mix uses 0.4–0.6 water to cement by weight. Too much water weakens the matrix; too little makes it unworkable.",
          "Cure it wet, load it late — concrete rewards patience. It gains strength over 28 days, with most gains in the first 7. Rushing the cure means a weaker building.",
          "Reinforcement solves concrete's weakness in tension. Steel bars carry the tensile forces while concrete handles compression. Together they are reinforced concrete — the material of the 20th century.",
          "Formwork is the mold: it shapes the liquid concrete until it hardens. The texture of the formwork becomes the texture of the wall — smooth plywood gives sleek surfaces; rough timber gives board-marked concrete (béton brut).",
        ],
        [
          "В/Ц отношение определяет прочность: меньше воды — плотнее камень. Типичная пропорция 0,4–0,6 вода/цемент.",
          "Бетон награждает терпение. Он набирает прочность 28 дней, с основными потерями за первые 7.",
          "Арматура решает слабость бетона на растяжение. Стальные стержни несут растягивающие силы, бетон — сжимающие.",
          "Опалубка — это форма: она формует жидкий бетон до затвердевания. Текстура опалубки становится текстурой стены.",
        ],
        { en: "Lower w/c ratio means:", ru: "Меньше В/Ц означает:" },
        ["Higher strength", "Better workability"],
        ["Более прочный", "Более подвижный"],
        0
      ),
      L(
        "m2", "Steel & Joints", "Сталь", "9 min", "intermediate",
        [
          "Steel is ductile: it yields visibly before it fails — a built-in warning system. This ductility is why steel buildings survive earthquakes better than brittle ones.",
          "But it softens near 550 °C: fire protection is structural design. An unprotected steel beam can lose 50% of its strength in minutes during a fire.",
          "Connections are the brain of a steel structure. Bolted connections are faster to erect; welded connections are stiffer. The choice affects the entire building's behavior.",
          "Steel's carbon content determines its grade: low carbon (A36) is ductile and weldable; high carbon is strong but brittle. Structural steel is almost always low-to-medium carbon.",
        ],
        [
          "Сталь пластична: она заметно деформируется до разрушения — встроенная система предупреждения.",
          "Она ослабевает около 550 °C: огнезащита — это конструктивное решение. Незащищённая балка может потерять 50% прочности за минуты.",
          "Соединения — мозг стальной конструкции. Болтовые — быстрее в монтаже; сварные — жёстче. Выбор влияет на всё поведение здания.",
          "Содержание углерода определяет марку: низкоуглеродстая (A36) пластична и свариваемая; высокоуглеродистая — прочная, но хрупкая.",
        ],
        { en: "Unprotected steel is critical near:", ru: "Незащищённая сталь критична при:" },
        ["550 °C", "100 °C"],
        ["550 °C", "100 °C"],
        0
      ),
      L(
        "m3", "Timber Futures", "Дерево", "7 min", "intermediate",
        [
          "Cross-laminated timber stacks strength like plywood — towers in wood. CLT panels can be up to 3 meters wide and 20 meters long, rivaling concrete in floor-to-floor construction.",
          "Grain direction is the whole game: strong along, weak across. A timber beam's strength depends entirely on how the grain runs relative to the load.",
          "Moisture is timber's enemy: above 20% moisture content, fungi attack. Good detailing keeps timber dry — generous overhangs, proper drainage, and ventilated cavities.",
          "Engineered timber (glulam, CLT, LVL) overcomes natural defects: knots, slopes of grain, and varying density. It is predictable, renewable, and stores carbon.",
        ],
        [
          "CLT — крестосламанный массив: башни из дерева. Панели CLT могут быть до 3 м шириной и 20 м длиной.",
          "Направление волокон — всё: вдоль — сильно, поперёк — слабо. Прочность балки зависит от того, как идёт волокно относительно нагрузки.",
          "Влага — враг дерева: выше 20% влажности грибы атакуют. Хорошая деталировка держит дерево сухим.",
          "Инженерное дерево (клееный брус, CLT, LVL) преодолевает природные дефекты: сучки, наклон волокон, переменную плотность.",
        ],
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
          "Doric, Ionic, Corinthian: a complete grammar of base, shaft, capital. Each order prescribes proportions, column spacing, and装饰 detail — a complete design system.",
          "The most ornate order carries the lightest loads — ornament as signal of wealth and divine favor. The Doric order, the simplest, was used for temples to gods of war.",
          "The orders are not just decoration — they are structural logic made visible. The column tapers because it carries less load at the top. The entasis (subtle bulge) corrects optical illusion.",
          "Roman architecture added Tuscan and Composite orders, completing the five. Renaissance architects codified them in treatises (Vignola, Palladio), making them the alphabet of Western architecture.",
        ],
        [
          "Дорика, ионика, коринфский: полная грамматика основания, ствола, капителя. Каждый ордер предписывает пропорции, шаг колонн, декор.",
          "Самый орнаментированный ордер несёт лёгкие нагрузки — орнамент как знак богатства и божественного благоволения.",
          "Ордера — не просто декорация, а конструктивная логика, сделанная видимой. Колонна сужается, потому что несёт меньше нагрузки наверху.",
          "Римская архитектура добавила тосканский и композитный ордера, завершив пять. Ренессансные архитекторы кодифицировали их в трактатах.",
        ],
        { en: "Most ornate order:", ru: "Самый декоративный ордер:" },
        ["Corinthian", "Doric"],
        ["Коринфский", "Дорический"],
        0
      ),
      L(
        "t2", "Modernism", "Модернизм", "8 min", "beginner",
        [
          "Form follows function: strip the ornament, expose the system. This was not just aesthetic — it was moral. Ornament was seen as dishonesty in an age of industry.",
          "Le Corbusier's five points — pilotis, free plan, free facade, ribbon windows, roof garden. Each point was enabled by reinforced concrete, which freed walls from structural duty.",
          "The Bauhaus (1919–1933) unified art, craft, and technology. Its principles — simplicity, functionality, mass production — shaped everything from buildings to furniture to typography.",
          "International Style (Mies, Johnson, Hitchcock) made glass and steel the language of power. Mies's 'less is more' became the creed of corporate architecture worldwide.",
        ],
        [
          "Форма следует функции: убрать орнамент, обнажить систему. Это было не просто эстетикой — это было моралью. Орнамент считали нечестностью.",
          "Пять пунктов Ле Корбюзье: пилотис, свободный план, свободный фасад, ленточные окна, крыша-сад. Каждый пункт был возможен благодаря ж/б.",
          "Баухауз (1919–1933) объединил искусство, ремесло и технологию. Его принципы — простота, функциональность, массовое производство — сформировали всё.",
          "Международный стиль (Мис, Джонсон, Хичкок) сделал стекло и сталь языком власти. 'Меньше — больше' стало credo корпоративной архитектуры.",
        ],
        { en: "The five points belong to:", ru: "Пять пунктов принадлежат:" },
        ["Le Corbusier", "F. L. Wright"],
        ["Ле Корбюзье", "Ф. Л. Райт"],
        0
      ),
      L(
        "t3", "Contemporary", "Современность", "7 min", "beginner",
        [
          "Parametricism: form computed from rules, constraints, and data. The algorithm is the drawing — parameters are the design decisions. Zaha Hadid's curves, BIG's diagrams, Foster's efficiency.",
          "Digital fabrication (CNC, 3D printing, robotic assembly) has made complex geometry buildable. What was once drawn by hand can now be computed and fabricated automatically.",
          "Sustainability is no longer optional: net-zero energy, biophilic design, circular material flows. The greenest building is the one that already exists — adaptive reuse over demolition.",
          "Contemporary architecture is pluralist: there is no single style. High-tech, deconstructivism, regionalism, parametricism — all coexist, each answering different cultural and environmental questions.",
        ],
        [
          "Параметризм: форма вычисляется по правилам, ограничениям и данным. Алгоритм и есть чертёж — параметры и есть решения.",
          "Цифровая фабрика (ЧПУ, 3D-печать, роботизированная сборка) сделала сложную геометрию построимой. Что рисовали рукой, теперь вычисляют и изготавливают автоматически.",
          "Устойчивое развитие больше не опционально: нулевая энергия, биофильный дизайн, циклические потоки материалов. Самое зелёное здание — уже существующее.",
          "Современная архитектура плюралистична: нет единого стиля. Хай-тек, деконструктивизм, регионализм, параметризм — все сосуществуют.",
        ],
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