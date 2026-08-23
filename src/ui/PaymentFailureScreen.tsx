import type { PaymentOutcome } from "../types/order";

const messages: Record<Exclude<PaymentOutcome, "success">, { title: string; detail: string }> = {
  "card-read-failed": { title: "카드를 읽지 못했어요", detail: "카드를 다시 꽂거나 결제기에 천천히 태그해 주세요." },
  "approval-failed": { title: "결제가 승인되지 않았어요", detail: "다른 카드나 결제 방법을 이용해 주세요." },
  cancelled: { title: "결제가 취소되었어요", detail: "주문 내용은 그대로 보관되어 있습니다." },
};

interface Props { failure: Exclude<PaymentOutcome, "success">; onRetry: () => void; onChangeMethod: () => void; onHelp: () => void; }
export function PaymentFailureScreen({ failure, onRetry, onChangeMethod, onHelp }: Props) {
  const message = messages[failure];
  return <main className="screen failure-screen" role="alert"><div className="failure-mark" aria-hidden="true">!</div><p className="eyebrow">결제되지 않았습니다</p><h1>{message.title}</h1><p className="failure-detail">{message.detail}<br /><strong>장바구니의 메뉴는 사라지지 않았어요.</strong></p><div className="recovery-actions"><button className="checkout-primary" onClick={onRetry}>다시 결제하기</button><button onClick={onChangeMethod}>다른 결제 방법</button><button onClick={onHelp}>직원 도움 요청</button></div></main>;
}
