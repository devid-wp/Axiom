import "./content.css";

interface Props {
  num: string;
  text: string;
  dur: string;
  active: boolean;
  done: boolean;
  onClick: () => void;
}

/* Curriculum item: a LESSON (content + knowledge check + practice live
   inside the lesson reader — quizzes are never separate entries). */
export function LessonRow({ num, text, dur, active, done, onClick }: Props) {
  return (
    <button className={active ? "lesson-row lesson-row--active" : "lesson-row"} onClick={onClick}>
      <span className={`lesson-row__status mono ${done ? "lesson-row__status--done" : ""}`}>
        {done ? "✓" : "○"}
      </span>
      <span className="lesson-row__main">
        <span className="lesson-row__top">
          <span className="lesson-row__num mono">{num}</span>
          <span className="lesson-row__text">{text}</span>
        </span>
        <span className="lesson-row__dur mono">{dur}</span>
      </span>
    </button>
  );
}
