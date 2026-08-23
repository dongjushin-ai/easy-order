import { useState } from "react";
import type { StoreMenu } from "../types/menu";

interface SearchScreenProps {
  menus: StoreMenu[];
  onBack: () => void;
  onHome: () => void;
  onSelect: (menuId: string) => void;
}

export function SearchScreen({ menus, onBack, onHome, onSelect }: SearchScreenProps) {
  const [query, setQuery] = useState("");
  const visible = query.trim() ? menus.filter((menu) => menu.name.includes(query.trim())) : menus;
  return (
    <main className="screen search-screen">
      <p className="eyebrow">1단계 · 메뉴 찾기</p>
      <h1>어떤 메뉴를 찾으세요?</h1>
      <label className="search-box">
        <span>메뉴 이름</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: 라떼, 떡볶이" autoFocus />
      </label>
      <p className="result-count">{query ? `검색 결과 ${visible.length}개` : `전체 메뉴 ${visible.length}개`}</p>
      <p className="scroll-hint">아래로 밀어 메뉴를 더 볼 수 있어요.</p><div className="menu-grid">
        {visible.map((menu) => <button className="menu-card compact selectable-card" key={menu.id} onClick={() => onSelect(menu.id)}><h2>{menu.name}</h2><strong>{menu.price.toLocaleString("ko-KR")}원</strong><span>선택하기</span></button>)}
        {!visible.length && <div className="empty-state">찾는 메뉴가 없어요.<br />다른 이름으로 검색해 보세요.</div>}
      </div>
      <nav className="screen-nav"><button onClick={onBack}>이전으로</button><button onClick={onHome}>처음으로</button></nav>
    </main>
  );
}
