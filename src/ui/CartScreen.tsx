import { useState } from "react";
import type { CartItem } from "../types/order";

interface Props { items: CartItem[]; onQuantity: (id: string, quantity: number) => void; onRemove: (id: string) => void; onAddMenu: () => void; onPay: () => void; onBack: () => void; }

export function CartScreen({ items, onQuantity, onRemove, onAddMenu, onPay, onBack }: Props) {
  const [pendingRemoval, setPendingRemoval] = useState<CartItem | null>(null);
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  function decrease(item: CartItem) { if (item.quantity === 1) setPendingRemoval(item); else onQuantity(item.id, item.quantity - 1); }
  function confirmRemoval() { if (pendingRemoval) onRemove(pendingRemoval.id); setPendingRemoval(null); }

  return <main className="screen cart-screen"><p className="eyebrow">3단계 · 주문 확인</p><h1>담은 메뉴를 확인해 주세요</h1><p className="cart-count" aria-live="polite">총 {totalQuantity}개 메뉴</p>
    {items.length ? <><p className="scroll-hint">아래로 밀어 담은 메뉴를 모두 확인할 수 있어요.</p><div className="cart-list">{items.map((item) => <article className="cart-item" key={item.id}><div><h2>{item.name}</h2><p>{item.options.map((option) => option.label).join(" · ")}</p><strong>{(item.unitPrice * item.quantity).toLocaleString("ko-KR")}원</strong><button className="remove-item" onClick={() => setPendingRemoval(item)}>이 메뉴 삭제</button></div><div className="mini-quantity" aria-label={`${item.name} 수량`}><button aria-label={`${item.name} 수량 줄이기`} onClick={() => decrease(item)}>−</button><span>{item.quantity}</span><button aria-label={`${item.name} 수량 늘리기`} onClick={() => onQuantity(item.id, item.quantity + 1)}>＋</button></div></article>)}</div></> : <div className="empty-cart"><strong>장바구니가 비어 있어요.</strong><p>메뉴를 먼저 골라 주세요.</p></div>}
    <div className="order-total"><span>총 결제 금액</span><strong>{total.toLocaleString("ko-KR")}원</strong></div>
    <button className="checkout-primary" disabled={!items.length} onClick={onPay}>{items.length ? "결제하러 가기" : "메뉴를 먼저 담아 주세요"}</button><div className="cart-actions"><button onClick={onAddMenu}>메뉴 추가하기</button><button onClick={onBack}>이전으로</button></div>
    {pendingRemoval && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="remove-title"><div className="confirm-modal"><h2 id="remove-title">이 메뉴를 삭제할까요?</h2><p><strong>{pendingRemoval.name}</strong>을 장바구니에서 삭제합니다.</p><div><button autoFocus onClick={() => setPendingRemoval(null)}>아니요, 유지할게요</button><button className="danger-action" onClick={confirmRemoval}>네, 삭제할게요</button></div></div></div>}
  </main>;
}
