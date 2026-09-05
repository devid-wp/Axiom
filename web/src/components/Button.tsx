import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./ui.css";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: "plain" | "primary" | "danger";
  enabled?: boolean;
}

export function Button({ kind = "plain", enabled = true, className = "", children, ...rest }: Props) {
  const cls = [
    "btn",
    kind === "primary" ? "btn--primary" : "",
    kind === "danger" ? "btn--danger" : "",
    !enabled ? "btn--disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} disabled={!enabled} {...rest}>
      {children}
    </button>
  );
}