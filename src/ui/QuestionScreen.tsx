import type { Question } from "../types/question";

interface QuestionScreenProps {
  question: Question;
  current: number;
  total: number;
  onAnswer: (optionId: string) => void;
  onBack: () => void;
  onHome: () => void;
}

export function QuestionScreen({ question, current, total, onAnswer, onBack, onHome }: QuestionScreenProps) {
  return (
    <main className="screen question-screen">
      <div className="progress-row"><span>추천 질문</span><strong>{current} / {total}</strong></div>
      <div className="progress-track"><span style={{ width: `${Math.min(100, current / total * 100)}%` }} /></div>
      <section className="question-copy"><h1>{question.text}</h1></section>
      <div className="option-list">
        {question.options.map((option) => (
          <button className={option.id === "neutral" ? "option-button neutral" : "option-button"} key={option.id} onClick={() => onAnswer(option.id)}>
            {option.label}
          </button>
        ))}
      </div>
      <nav className="screen-nav"><button onClick={onBack}>이전으로</button><button onClick={onHome}>처음으로</button></nav>
    </main>
  );
}
