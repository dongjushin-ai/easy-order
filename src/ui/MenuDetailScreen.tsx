import { useMemo, useState } from "react";
import type { StoreMenu } from "../types/menu";
import type { CartItem, SelectedOrderOption } from "../types/order";
import type { StoreCatalog } from "../types/store";

interface Props { store: StoreCatalog; menu: StoreMenu; onAdd: (item: CartItem) => void; onBack: () => void; onHome: () => void; }

export function MenuDetailScreen({ store, menu, onAdd, onBack, onHome }: Props) {
  const groups = store.orderOptionGroups.filter((group) => menu.optionGroupIds?.includes(group.id));
  const [selections, setSelections] = useState<Record<string, string>>(() => Object.fromEntries(groups.map((group) => [group.id, group.choices[0]?.id])));
  const [quantity, setQuantity] = useState(1);
  const selectedOptions = useMemo<SelectedOrderOption[]>(() => groups.flatMap((group) => {
    const choice = group.choices.find((item) => item.id === selections[group.id]);
    return choice ? [{ groupId: group.id, choiceId: choice.id, label: `${group.label}: ${choice.label}`, priceDelta: choice.priceDelta }] : [];
  }), [groups, selections]);
  const unitPrice = menu.price + selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0);

  return <main className="screen detail-screen">
    <p className="eyebrow">2단계 · 메뉴 선택</p><h1>{menu.name}</h1><p className="detail-price">기본 {menu.price.toLocaleString("ko-KR")}원</p>
    <p className="scroll-hint">옵션이 많으면 아래로 밀어 계속 볼 수 있어요.</p><div className="option-groups">{groups.map((group) => <fieldset key={group.id}><legend>{group.label}</legend><div className="detail-choices">{group.choices.map((choice) => { const selected = selections[group.id] === choice.id; return <label className={selected ? "detail-choice selected" : "detail-choice"} key={choice.id}><input type="radio" name={group.id} value={choice.id} checked={selected} onChange={() => setSelections({ ...selections, [group.id]: choice.id })} /><strong>{choice.label}</strong><span>{choice.priceDelta ? `+${choice.priceDelta.toLocaleString("ko-KR")}원` : "추가금 없음"}</span>{selected && <em>✓ 선택됨</em>}</label>; })}</div></fieldset>)}</div>
    <div className="quantity-row"><strong>수량</strong><div><button aria-label="수량 줄이기" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button><span>{quantity}</span><button aria-label="수량 늘리기" onClick={() => setQuantity(quantity + 1)}>＋</button></div></div>
    <button className="checkout-primary" onClick={() => onAdd({ id: `${menu.id}-${Date.now()}`, menuId: menu.id, name: menu.name, basePrice: menu.price, quantity, options: selectedOptions, unitPrice })}>{(unitPrice * quantity).toLocaleString("ko-KR")}원 · 장바구니 담기</button>
    <nav className="screen-nav"><button onClick={onBack}>이전으로</button><button onClick={onHome}>처음으로</button></nav>
  </main>;
}
