import "./content.css";

interface Props {
  text: string;
  picked: boolean;
  right: boolean;
  revealed: boolean;
  onClick: () => void;
}

export function QuizOpt({ text, picked, right, revealed, onClick }: Props) {
  let cls = "quiz-opt";
  if (revealed && right) cls += " quiz-opt--right";
  if (revealed && !right) cls += " quiz-opt--wrong";
  if (picked) cls += " quiz-opt--picked";
  return (
    <button className={cls} onClick={onClick}>
      <span className={`quiz-opt__radio ${picked ? "quiz-opt__radio--on" : ""}`} />
      <span className="quiz-opt__text">{text}</span>
      {revealed && right && <span className="quiz-opt__check">✓</span>}
    </button>
  );
}