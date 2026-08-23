import type { StoreCatalog } from "../types/store";
import type { UserAnswer } from "../types/question";
import { getFeatureSummary, getRecommendationReason, getRecommendations } from "../app/kioskFlow";

interface RecommendationScreenProps {
  store: StoreCatalog;
  history: UserAnswer[];
  onAllMenus: () => void;
  onBack: () => void;
  onReset: () => void;
  onSelect: (menuId: string) => void;
}

export function RecommendationScreen({ store, history, onAllMenus, onBack, onReset, onSelect }: RecommendationScreenProps) {
  const recommendations = getRecommendations(store, history);
  return (
    <main className="screen result-screen">
      <p className="eyebrow">추천 결과</p>
      <h1>이 메뉴는 어떠세요?</h1>
      <p className="lead">답변을 바탕으로 잘 맞는 메뉴를 골랐어요.</p>
      <div className="recommendation-list">
        {recommendations.map(({ menu }, index) => (
          <button className="menu-card recommendation selectable-card" key={menu.id} onClick={() => onSelect(menu.id)}>
            <span className="rank">{index + 1}순위</span>
            <div><h2>{menu.name}</h2><p>{getRecommendationReason(store, menu, history)}</p><small>{getFeatureSummary(store, menu) || "매장 추천 메뉴"}</small></div>
            <strong>{menu.price.toLocaleString("ko-KR")}원</strong>
          </button>
        ))}
      </div>
      <div className="result-actions"><button className="secondary-action" onClick={onAllMenus}>전체 메뉴 보기</button><button className="secondary-action" onClick={onBack}>답변 바꾸기</button><button className="text-action" onClick={onReset}>처음부터 다시</button></div>
    </main>
  );
}
