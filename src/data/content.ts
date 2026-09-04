export type Category = 'styles' | 'structures' | 'materials' | 'engineering';

export type Topic = {
  id: string;
  category: Category;
  title: { en: string; ru: string };
  desc: { en: string; ru: string };
  readTime: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  image: string; // emoji placeholder
  content: { en: string; ru: string }[];
};

export type Lesson = {
  id: string;
  title: { en: string; ru: string };
  duration: string;
  content: { en: string[]; ru: string[] };
  quiz: {
    q: { en: string; ru: string };
    options: { en: string[]; ru: string[] };
    correct: number;
  };
};

export type Course = {
  id: string;
  title: { en: string; ru: string };
  desc: { en: string; ru: string };
  level: string;
  accent: string;
  lessonsCount: number;
  lessons: Lesson[];
  image: string;
};

export const topics: Topic[] = [
  {
    id: 'gothic',
    category: 'styles',
    title: { en: 'Gothic — Light as Structure', ru: 'Готика — свет как конструкция' },
    desc: { en: 'Pointed arches, ribbed vaults and flying buttresses.', ru: 'Стрельчатые арки, нервюрные своды и аркбутаны.' },
    readTime: '6 min',
    level: 'Beginner',
    image: '⛪',
    content: [
      { en: 'Gothic architecture turns structure into light. Pointed arches reduce lateral thrust, allowing taller openings.', ru: 'Готика превращает конструкцию в свет. Стрельчатые арки снижают боковой распор, позволяя делать проёмы выше.' },
      { en: 'Flying buttresses carry vault thrust outside the wall — hence vast stained glass walls at Chartres and Sainte-Chapelle.', ru: 'Аркбутаны выносят распор свода наружу — отсюда огромные витражи в Шартре и Сент-Шапель.' },
    ]
  },
  {
    id: 'brutalism',
    category: 'styles',
    title: { en: 'Brutalism — Truth of Material', ru: 'Брутализм — честность материала' },
    desc: { en: 'Raw concrete (béton brut), mass and shadow.', ru: 'Открытый бетон (béton brut), масса и тень.' },
    readTime: '5 min',
    level: 'Beginner',
    image: '🏢',
    content: [
      { en: 'Brutalism celebrates concrete as finished surface. Formwork texture remains visible — a record of making.', ru: 'Брутализм прославляет бетон как финишную поверхность. Текстура опалубки остаётся видимой — след изготовления.' },
    ]
  },
  {
    id: 'japanese',
    category: 'styles',
    title: { en: 'Japanese Timber — Joinery without Nails', ru: 'Японский каркас — соединения без гвоздей' },
    desc: { en: 'Post-and-beam, flexibility, seismic resilience.', ru: 'Стоечно-балочная система, гибкость, сейсмостойкость.' },
    readTime: '7 min',
    level: 'Intermediate',
    image: '⛩️',
    content: [
      { en: 'Japanese joinery (kigumi) allows wood to move with humidity and earthquakes without metal fasteners.', ru: 'Японские соединения (кигуми) позволяют дереву двигаться при влажности и землетрясениях без металла.' },
    ]
  },
  {
    id: 'truss',
    category: 'structures',
    title: { en: 'Trusses — Triangles that Span', ru: 'Фермы — треугольники, перекрывающие пролёт' },
    desc: { en: 'Why triangles are the only inherently rigid polygon.', ru: 'Почему треугольник — единственный жёсткий многоугольник.' },
    readTime: '8 min',
    level: 'Beginner',
    image: '🔷',
    content: [
      { en: 'A truss converts bending into axial tension and compression in members — extremely efficient for bridges and roofs.', ru: 'Ферма превращает изгиб в осевое растяжение и сжатие в элементах — сверхэффективно для мостов и крыш.' },
    ]
  },
  {
    id: 'arch',
    category: 'structures',
    title: { en: 'Arches & Vaults', ru: 'Арки и своды' },
    desc: { en: 'Compression-only forms. Chain vs. parabola.', ru: 'Формы, работающие только на сжатие. Цепная линия vs. парабола.' },
    readTime: '6 min',
    level: 'Beginner',
    image: '🌉',
    content: [
      { en: 'An arch works if its shape follows the thrust line. Inverted catenary is ideal for uniform self-weight.', ru: 'Арка работает, если её форма следует линии распора. Перевёрнутая цепная линия идеальна для собственного веса.' },
    ]
  },
  {
    id: 'concrete',
    category: 'materials',
    title: { en: 'Concrete — Liquid Stone', ru: 'Бетон — жидкий камень' },
    desc: { en: 'Aggregate, cement, water. Curing, creep, reinforcement.', ru: 'Заполнитель, цемент, вода. Твердение, ползучесть, армирование.' },
    readTime: '7 min',
    level: 'Beginner',
    image: '🧱',
    content: [
      { en: 'Concrete is strong in compression, weak in tension — hence steel bars where tension occurs.', ru: 'Бетон прочен на сжатие, слаб на растяжение — отсюда стальная арматура там, где растяжение.' },
    ]
  },
  {
    id: 'steel',
    category: 'materials',
    title: { en: 'Steel — Tensile Grace', ru: 'Сталь — грация растяжения' },
    desc: { en: 'Ductility, yield, connections and fire protection.', ru: 'Пластичность, текучесть, узлы и огнезащита.' },
    readTime: '5 min',
    level: 'Intermediate',
    image: '🏗️',
    content: [{ en: 'Steel yields before it breaks — giving warning and allowing load redistribution.', ru: 'Сталь течёт до разрушения — предупреждает и позволяет перераспределить нагрузки.' }]
  },
  {
    id: 'wood',
    category: 'materials',
    title: { en: 'Timber — Anisotropic Warmth', ru: 'Дерево — анизотропное тепло' },
    desc: { en: 'Grain, moisture, CLT and engineered timber.', ru: 'Волокна, влажность, CLT и инженерная древесина.' },
    readTime: '6 min',
    level: 'Beginner',
    image: '🪵',
    content: [{ en: 'Wood strength depends on direction to grain — up to 40x difference parallel vs. perpendicular.', ru: 'Прочность дерева зависит от направления волокон — до 40 раз вдоль и поперёк.' }]
  },
  {
    id: 'loads',
    category: 'engineering',
    title: { en: 'Loads & Equilibrium', ru: 'Нагрузки и равновесие' },
    desc: { en: 'Dead, live, wind, seismic. Equilibrium in three equations.', ru: 'Постоянные, временные, ветровые, сейсмические. Равновесие в трёх уравнениях.' },
    readTime: '8 min',
    level: 'Beginner',
    image: '⚖️',
    content: [{ en: 'ΣF_x=0, ΣF_y=0, ΣM=0 — the whole statics of structures rests on these.', ru: 'ΣF_x=0, ΣF_y=0, ΣM=0 — вся статика конструкций держится на этом.' }]
  },
  {
    id: 'beams',
    category: 'engineering',
    title: { en: 'Beams — Bending & Shear', ru: 'Балки — изгиб и срез' },
    desc: { en: 'Moment diagrams, neutral axis, deflection.', ru: 'Эпюры моментов, нейтральная ось, прогиб.' },
    readTime: '9 min',
    level: 'Intermediate',
    image: '📐',
    content: [{ en: 'Bending stress σ = My/I — linear through depth, zero at neutral axis, maximum at fibers.', ru: 'Напряжение изгиба σ = My/I — линейно по высоте, ноль на нейтрали, максимум на фибрах.' }]
  },
];

export const courses: Course[] = [
  {
    id: 'fundamentals',
    title: { en: 'Fundamentals of Architecture', ru: 'Основы архитектуры' },
    desc: { en: 'Space, order, light and human scale. How architects think before they draw.', ru: 'Пространство, порядок, свет и масштаб человека. Как мыслят архитекторы до чертежа.' },
    level: 'Beginner • 4 lessons',
    accent: '#E6FF52',
    lessonsCount: 4,
    image: '◐',
    lessons: [
      {
        id: 'f1',
        title: { en: 'What is Architecture?', ru: 'Что такое архитектура?' },
        duration: '8 min',
        content: {
          en: ['Architecture is not just building. Vitruvius defined firmitas, utilitas, venustas — firmness, commodity, delight.', 'We shape space to shape behavior. A corridor accelerates, a courtyard pauses.', 'Learn to see mass vs. void, rhythm, proportion and threshold.'],
          ru: ['Архитектура — не просто строительство. Витрувий: firmitas, utilitas, venustas — прочность, польза, красота.', 'Мы формируем пространство, чтобы формировать поведение. Коридор ускоряет, дворик останавливает.', 'Учитесь видеть массу и пустоту, ритм, пропорции и порог.']
        },
        quiz: { q: { en: 'Vitruvian triad includes:', ru: 'Триада Витрувия включает:' }, options: { en: ['Firmitas, Utilitas, Venustas', 'Steel, Glass, Concrete', 'Plan, Section, Elevation'], ru: ['Firmitas, Utilitas, Venustas', 'Сталь, Стекло, Бетон', 'План, Разрез, Фасад'] }, correct: 0 }
      },
      {
        id: 'f2',
        title: { en: 'Order & Proportion', ru: 'Порядок и пропорции' },
        duration: '10 min',
        content: {
          en: ['From Classical orders to modular grids, proportion creates harmony.', 'Study golden ratio, regulating lines (Le Corbusier) and tatami module.', 'Exercise: redraw a facade using only 3 proportional rectangles.'],
          ru: ['От классических ордеров до модульных сеток — пропорция создаёт гармонию.', 'Изучите золотое сечение, регулирующие линии (Ле Корбюзье) и модуль татами.', 'Упражнение: перечертите фасад только из 3 пропорциональных прямоугольников.']
        },
        quiz: { q: { en: 'Regulating lines were promoted by:', ru: 'Регулирующие линии продвигал:' }, options: { en: ['Le Corbusier', 'Mies van der Rohe', 'Zaha Hadid'], ru: ['Ле Корбюзье', 'Мис ван дер Роэ', 'Заха Хадид'] }, correct: 0 }
      },
      {
        id: 'f3',
        title: { en: 'Light & Material', ru: 'Свет и материал' },
        duration: '9 min',
        content: {
          en: ['Light reveals material. Kahn: “A room is not a room without natural light.”', 'Compare how concrete, wood and glass modulate light differently.', 'Design a window where wall thickness becomes light sculpture.'],
          ru: ['Свет выявляет материал. Кан: «Комната — не комната без естественного света».', 'Сравните, как бетон, дерево и стекло по-разному модулируют свет.', 'Спроектируйте окно, где толщина стены становится световой скульптурой.']
        },
        quiz: { q: { en: '“A room is not a room without natural light” — author:', ru: '«Комната — не комната без естественного света» — автор:' }, options: { en: ['Louis Kahn', 'Tadao Ando', 'Alvar Aalto'], ru: ['Луис Кан', 'Тадао Андо', 'Алвар Аалто'] }, correct: 0 }
      },
      {
        id: 'f4',
        title: { en: 'Human Scale', ru: 'Человеческий масштаб' },
        duration: '7 min',
        content: {
          en: ['Doors 2100mm high recall our body. Steps 150/300 reflect gait.', 'Scale is relational: a 5m ceiling can feel intimate with careful subdivision.'],
          ru: ['Двери 2100 мм помнят тело. Ступени 150/300 отражают шаг.', 'Масштаб относителен: потолок 5 м может быть уютным при грамотном членении.']
        },
        quiz: { q: { en: 'Standard comfortable riser is around:', ru: 'Комфортный подступенок около:' }, options: { en: ['150–170 mm', '220 mm', '90 mm'], ru: ['150–170 мм', '220 мм', '90 мм'] }, correct: 0 }
      },
    ]
  },
  {
    id: 'structures',
    title: { en: 'Structures that Stand', ru: 'Конструкции, которые стоят' },
    desc: { en: 'Beams, arches, trusses and frames — how forces flow to the ground.', ru: 'Балки, арки, фермы и рамы — как силы стекают на землю.' },
    level: 'Beginner • 4 lessons',
    accent: '#8B8FF0',
    lessonsCount: 4,
    image: '⬢',
    lessons: [
      {
        id: 's1',
        title: { en: 'Loads & Paths', ru: 'Нагрузки и пути сил' },
        duration: '9 min',
        content: {
          en: ['Every building resolves ΣF=0. Dead load always present; live load moves; wind pushes; earthquakes shake.', 'Trace a load path: slab → beam → column → foundation → soil.'],
          ru: ['Каждое здание решает ΣF=0. Постоянная нагрузка всегда, временная движется, ветер давит, землетрясение трясёт.', 'Проследите путь: плита → балка → колонна → фундамент → грунт.']
        },
        quiz: { q: { en: 'Load path ends at:', ru: 'Путь нагрузки заканчивается в:' }, options: { en: ['Soil / foundation', 'Roof', 'Facade'], ru: ['Грунте / фундаменте', 'Крыше', 'Фасаде'] }, correct: 0 }
      },
      {
        id: 's2',
        title: { en: 'Beams & Bending', ru: 'Балки и изгиб' },
        duration: '11 min',
        content: {
          en: ['A beam bends: top fibers compress, bottom stretch. Neutral axis carries zero stress.', 'Deeper beam is stronger proportional to depth squared — hence I-beams.'],
          ru: ['Балка изгибается: верхние волокна сжимаются, нижние растягиваются. Нейтраль без напряжения.', 'Чем выше балка, тем прочнее — пропорционально квадрату высоты, отсюда двутавры.']
        },
        quiz: { q: { en: 'I-beam is efficient because:', ru: 'Двутавр эффективен, потому что:' }, options: { en: ['Material concentrated far from neutral axis', 'It is heavier', 'It looks modern'], ru: ['Материал вынесен от нейтрали', 'Он тяжелее', 'Он современно выглядит'] }, correct: 0 }
      },
      {
        id: 's3',
        title: { en: 'Arches & Cables', ru: 'Арки и ванты' },
        duration: '8 min',
        content: {
          en: ['Arch = inverted catenary. Cable = catenary. Both pure axial, no bending if shaped correctly.', 'Gaudí hung chains to find ideal arch shapes.'],
          ru: ['Арка = перевёрнутая цепная линия. Ванта = цепная линия. Обе чисто осевые, без изгиба при правильной форме.', 'Гауди подвешивал цепи, чтобы найти идеальные арки.']
        },
        quiz: { q: { en: 'Ideal arch shape for self-weight is:', ru: 'Идеальная форма арки под собственный вес:' }, options: { en: ['Inverted catenary', 'Semicircle always', 'Random curve'], ru: ['Перевёрнутая цепная линия', 'Всегда полукруг', 'Произвольная кривая'] }, correct: 0 }
      },
      {
        id: 's4',
        title: { en: 'Frames & Stability', ru: 'Рамы и устойчивость' },
        duration: '10 min',
        content: {
          en: ['Rigid frame resists lateral load by bending at joints. Braced frame by triangulation.', 'Choose: moment frame for openness, braced frame for efficiency.'],
          ru: ['Жёсткая рама сопротивляется боковым нагрузкам изгибом в узлах. Связевая — треугольниками.', 'Выбор: рамная — для открытости, связевая — для эффективности.']
        },
        quiz: { q: { en: 'Triangulation provides:', ru: 'Триaнгуляция даёт:' }, options: { en: ['Geometric rigidity', 'More glass', 'Heavier look'], ru: ['Геометрическую жёсткость', 'Больше стекла', 'Тяжёлый вид'] }, correct: 0 }
      },
    ]
  },
  {
    id: 'materials',
    title: { en: 'Materials & Tectonics', ru: 'Материалы и тектоника' },
    desc: { en: 'Concrete, steel, timber, masonry — what each wants to be.', ru: 'Бетон, сталь, дерево, камень — кем хочет быть каждый материал.' },
    level: 'Intermediate • 3 lessons',
    accent: '#FF8A5B',
    lessonsCount: 3,
    image: '▭',
    lessons: [
      {
        id: 'm1',
        title: { en: 'Concrete', ru: 'Бетон' },
        duration: '8 min',
        content: {
          en: ['Mix design: water-cement ratio determines strength. Cure 28 days for full strength.', 'Pre-stress keeps concrete in compression even under load — longer spans.'],
          ru: ['Состав: водоцементное отношение определяет прочность. 28 дней твердения до марочной прочности.', 'Преднапряжение держит бетон сжатым даже под нагрузкой — большие пролёты.']
        },
        quiz: { q: { en: 'Lower w/c ratio gives:', ru: 'Меньшее В/Ц даёт:' }, options: { en: ['Higher strength', 'More workability', 'Faster corrosion'], ru: ['Большую прочность', 'Большую подвижность', 'Быструю коррозию'] }, correct: 0 }
      },
      {
        id: 'm2',
        title: { en: 'Steel & Joints', ru: 'Сталь и узлы' },
        duration: '9 min',
        content: {
          en: ['Steel is ductile: it warns before failure. Connections are design — welded vs. bolted.', 'Fireproofing is essential: steel loses half strength at 550°C.'],
          ru: ['Сталь пластична: предупреждает перед разрушением. Узлы — суть проекта, сварные vs. болтовые.', 'Огнезащита обязательна: при 550°C сталь теряет половину прочности.']
        },
        quiz: { q: { en: 'Steel critical temperature approx:', ru: 'Критическая температура стали около:' }, options: { en: ['550°C', '100°C', '1200°C'], ru: ['550°C', '100°C', '1200°C'] }, correct: 0 }
      },
      {
        id: 'm3',
        title: { en: 'Timber Futures', ru: 'Будущее дерева' },
        duration: '7 min',
        content: {
          en: ['CLT and glulam allow timber towers. Carbon storage: wood locks CO₂.', 'Detail for movement: wood expands across grain with moisture.'],
          ru: ['CLT и клеёный брус позволяют деревянные башни. Хранение углерода: дерево запирает CO₂.', 'Учитывайте движение: поперёк волокон дерево разбухает от влаги.']
        },
        quiz: { q: { en: 'CLT stands for:', ru: 'CLT — это:' }, options: { en: ['Cross-Laminated Timber', 'Concrete Layered Technique', 'Cable Load Transfer'], ru: ['Cross-Laminated Timber', 'Бетонная слоистая техника', 'Вантовая передача нагрузки'] }, correct: 0 }
      },
    ]
  },
  {
    id: 'styles',
    title: { en: 'Styles Through Time', ru: 'Стили сквозь время' },
    desc: { en: 'From Doric to Deconstructivism — reading a facade like a text.', ru: 'От дорики до деконструктивизма — читаем фасад как текст.' },
    level: 'Beginner • 3 lessons',
    accent: '#4ADE80',
    lessonsCount: 3,
    image: '⬣',
    lessons: [
      {
        id: 't1',
        title: { en: 'Classical Orders', ru: 'Классические ордера' },
        duration: '7 min',
        content: { en: ['Doric austere, Ionic scrolls, Corinthian leaves. Entablature + column = language.', 'Modernism reinterpreted order as free plan and pilotis.'], ru: ['Дорика сурова, ионика с волютами, коринф с листьями. Антаблемент + колонна = язык.', 'Модернизм переосмыслил ордер как свободный план и пилоты.'] },
        quiz: { q: { en: 'Most ornate classical order:', ru: 'Самый декоративный ордер:' }, options: { en: ['Corinthian', 'Doric', 'Tuscan'], ru: ['Коринфский', 'Дорический', 'Тосканский'] }, correct: 0 }
      },
      {
        id: 't2',
        title: { en: 'Modernism', ru: 'Модернизм' },
        duration: '8 min',
        content: { en: ['Form follows function. Five points of Le Corbusier: pilotis, free plan, free facade, ribbon window, roof garden.'], ru: ['Форма следует функции. Пять пунктов Ле Корбюзье: пилоты, свободный план, свободный фасад, ленточное окно, сад на крыше.'] },
        quiz: { q: { en: 'Five points author:', ru: 'Автор пяти пунктов:' }, options: { en: ['Le Corbusier', 'Wright', 'Mies'], ru: ['Ле Корбюзье', 'Райт', 'Мис'] }, correct: 0 }
      },
      {
        id: 't3',
        title: { en: 'Contemporary', ru: 'Современность' },
        duration: '7 min',
        content: { en: ['High-tech, minimalism, parametricism. Material honesty meets computation.'], ru: ['Хай-тек, минимализм, параметризм. Честность материала встречается с вычислениями.'] },
        quiz: { q: { en: 'Parametric design uses:', ru: 'Параметрический дизайн использует:' }, options: { en: ['Algorithms & parameters', 'Only hand drawing', 'Random shapes'], ru: ['Алгоритмы и параметры', 'Только ручную графику', 'Случайные формы'] }, correct: 0 }
      },
    ]
  },
];
