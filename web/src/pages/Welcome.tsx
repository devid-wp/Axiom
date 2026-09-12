import { useUi } from "@/store/ui";
import { markWelcomeSeen } from "@/store/onboarding";
import {
  ArrowRight,
  BookOpen,
  Box,
  Eye,
  Hand,
  Hammer,
  Zap,
} from "lucide-react";
import "./Welcome.css";

type Lang = "en" | "ru";

const T = {
  eyebrow: { en: "Architecture learning environment", ru: "Среда изучения архитектуры" },
  heroA: { en: "Learn architecture.", ru: "Учите архитектуру." },
  heroB: { en: "Build with purpose.", ru: "Стройте осмысленно." },
  support: {
    en: "Architecture isn't something you only read about. AXIOM helps you understand architectural concepts, practice them through guided exercises, and turn what you learn into real structures.",
    ru: "Архитектуру недостаточно только читать. AXIOM помогает понять концепции, отработать их в упражнениях с гидом и превратить знания в настоящие конструкции.",
  },
  loopKicker: { en: "How learning works", ru: "Как устроено обучение" },
  learn: { en: "LEARN", ru: "УЧИТЕ" },
  learnSub: { en: "Understand the concept.", ru: "Поймите идею." },
  practice: { en: "PRACTICE", ru: "ПРАКТИКА" },
  practiceSub: { en: "Follow a guided exercise and try it yourself.", ru: "Пройдите упражнение с гидом и попробуйте сами." },
  build: { en: "BUILD", ru: "СТРОЙКА" },
  buildSub: { en: "Apply what you learned inside Studio.", ru: "Примените знания в Studio." },
  study: { en: "STUDY", ru: "УЧЁБА" },
  studySub: {
    en: "Learn the theory behind architecture through lessons, examples, questions and explanations.",
    ru: "Теория архитектуры: уроки, примеры, вопросы и объяснения.",
  },
  studio: { en: "STUDIO", ru: "STUDIO" },
  studioSub: {
    en: "Turn knowledge into practice. Create structures, explore hierarchy, materials, dimensions and relationships.",
    ru: "Превращайте знания в практику. Создавайте конструкции, изучайте иерархию, материалы, размеры и связи.",
  },
  guidedKicker: { en: "Guided learning", ru: "Обучение с гидом" },
  guidedTitle: {
    en: "Your first projects, guided step by step.",
    ru: "Первые проекты — шаг за шагом, с гидом.",
  },
  watch: { en: "Watch a demonstration.", ru: "Смотрите демонстрацию." },
  control: { en: "Take control.", ru: "Возьмите управление." },
  yourself: { en: "Build it yourself.", ru: "Стройте сами." },
  feedback: { en: "Get immediate feedback.", ru: "Получайте отклик сразу." },
  cont: { en: "Continue when you understand.", ru: "Продолжайте, когда поняли." },
  start: { en: "Start learning", ru: "Начать учиться" },
  explore: { en: "Explore Studio", ru: "Открыть Studio" },
} as const;

function tx(lang: Lang, key: keyof typeof T): string {
  return T[key][lang];
}

export function WelcomePage() {
  const lang = useUi((s) => s.lang) as Lang;
  const setView = useUi((s) => s.setView);

  const go = (view: "study" | "studio") => {
    markWelcomeSeen();
    setView(view);
  };

  return (
    <div className="page welcome">
      <div className="welcome__glow" aria-hidden />
      <div className="welcome__scroll">
        <div className="welcome__column">
          <section className="welcome__hero welcome__anim" style={{ animationDelay: "0ms" }}>
            <span className="eyebrow eyebrow--noted">{tx(lang, "eyebrow")}</span>
            <h1 className="welcome__word">AXIOM</h1>
            <p className="welcome__hero-lines">
              {tx(lang, "heroA")}
              <br />
              <span className="welcome__hero-accent">{tx(lang, "heroB")}</span>
            </p>
            <p className="welcome__support">{tx(lang, "support")}</p>
          </section>

          <section className="welcome__loop welcome__anim" style={{ animationDelay: "90ms" }}>
            <span className="eyebrow">{tx(lang, "loopKicker")}</span>
            <div className="welcome__loop-row">
              <div className="welcome__loop-step">
                <span className="welcome__loop-num mono">01</span>
                <span className="welcome__loop-name">{tx(lang, "learn")}</span>
                <span className="welcome__loop-sub">{tx(lang, "learnSub")}</span>
              </div>
              <span className="welcome__loop-sep" aria-hidden>→</span>
              <div className="welcome__loop-step">
                <span className="welcome__loop-num mono">02</span>
                <span className="welcome__loop-name">{tx(lang, "practice")}</span>
                <span className="welcome__loop-sub">{tx(lang, "practiceSub")}</span>
              </div>
              <span className="welcome__loop-sep" aria-hidden>→</span>
              <div className="welcome__loop-step">
                <span className="welcome__loop-num mono">03</span>
                <span className="welcome__loop-name">{tx(lang, "build")}</span>
                <span className="welcome__loop-sub">{tx(lang, "buildSub")}</span>
              </div>
            </div>
          </section>

          <section className="welcome__modes welcome__anim" style={{ animationDelay: "170ms" }}>
            <div className="welcome__mode">
              <span className="welcome__mode-icon"><BookOpen size={17} /></span>
              <div className="welcome__mode-body">
                <span className="welcome__mode-name">{tx(lang, "study")}</span>
                <span className="welcome__mode-sub">{tx(lang, "studySub")}</span>
              </div>
            </div>
            <div className="welcome__mode">
              <span className="welcome__mode-icon"><Box size={17} /></span>
              <div className="welcome__mode-body">
                <span className="welcome__mode-name">{tx(lang, "studio")}</span>
                <span className="welcome__mode-sub">{tx(lang, "studioSub")}</span>
              </div>
            </div>
          </section>

          <section className="welcome__guided welcome__anim" style={{ animationDelay: "250ms" }}>
            <span className="eyebrow eyebrow--noted">{tx(lang, "guidedKicker")}</span>
            <p className="welcome__guided-title">{tx(lang, "guidedTitle")}</p>
            <div className="welcome__guided-row">
              <span className="welcome__guided-item"><Eye size={13} />{tx(lang, "watch")}</span>
              <span className="welcome__guided-item"><Hand size={13} />{tx(lang, "control")}</span>
              <span className="welcome__guided-item"><Hammer size={13} />{tx(lang, "yourself")}</span>
              <span className="welcome__guided-item"><Zap size={13} />{tx(lang, "feedback")}</span>
              <span className="welcome__guided-item"><ArrowRight size={13} />{tx(lang, "cont")}</span>
            </div>
          </section>

          <section className="welcome__cta welcome__anim" style={{ animationDelay: "330ms" }}>
            <button className="welcome__start" onClick={() => go("study")}>
              {tx(lang, "start")}
              <ArrowRight size={15} />
            </button>
            <button className="welcome__explore" onClick={() => go("studio")}>
              {tx(lang, "explore")}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
