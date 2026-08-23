interface StartScreenProps {
  onSearch: () => void;
  onRecommend: () => void;
}

export function StartScreen({ onSearch, onRecommend }: StartScreenProps) {
  return (
    <main className="screen start-screen">
      <div className="welcome-mark" aria-hidden="true">한 끼</div>
      <p className="eyebrow">쉬운 메뉴 선택</p>
      <h1>무엇을 도와드릴까요?</h1>
      <p className="lead">천천히 골라도 괜찮아요. 원하는 방법을 눌러주세요.</p>
      <div className="primary-actions">
        <button className="choice-card" onClick={onSearch}>
          <span className="choice-number">01</span>
          <strong>먹고 싶은 메뉴가<br />정해져 있어요</strong>
          <span>메뉴 이름으로 바로 찾기</span>
        </button>
        <button className="choice-card accent" onClick={onRecommend}>
          <span className="choice-number">02</span>
          <strong>추천받고 싶어요</strong>
          <span>몇 가지 질문으로 함께 고르기</span>
        </button>
      </div>
    </main>
  );
}
