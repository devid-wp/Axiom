interface Props {
  num: string;
  text: string;
  dur: string;
  active: boolean;
  done: boolean;
  onClick: () => void;
}

export function LessonRow({ num, text, dur, active, done, onClick }: Props) {
  return (
    <button className={active ? "lesson-row lesson-row--active" : "lesson-row"} onClick={onClick}>
      <span className={`lesson-row__num mono ${done ? "lesson-row__num--done" : ""}`}>{done ? "✓" : num}</span>
      <span className="lesson-row__text">{text}</span>
      <span className="lesson-row__dur mono">{dur}</span>
    </button>
  );
}