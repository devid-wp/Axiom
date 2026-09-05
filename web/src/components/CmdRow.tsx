import type { ReactNode } from "react";
import "./content.css";

interface Props {
  icon: ReactNode;
  title: string;
  hint?: string;
  primary?: boolean;
  onClick: () => void;
}

export function CmdRow({ icon, title, hint, primary, onClick }: Props) {
  return (
    <button className={primary ? "cmd-row cmd-row--primary" : "cmd-row"} onClick={onClick}>
      <span className={`cmd-row__icon ${primary ? "cmd-row__icon--primary" : ""}`}>{icon}</span>
      <span className="cmd-row__title">{title}</span>
      {hint && <span className="cmd-row__hint mono">{hint}</span>}
    </button>
  );
}