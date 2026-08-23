interface HelpButtonProps {
  onClick: () => void;
}

export function HelpButton({ onClick }: HelpButtonProps) {
  return <button className="help-button" onClick={onClick}>직원 도움</button>;
}
