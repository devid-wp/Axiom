interface Props {
  text: string;
}

export function Caption({ text }: Props) {
  return <div className="caption">{text}</div>;
}