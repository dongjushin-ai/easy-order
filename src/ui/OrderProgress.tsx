interface Props { current: 1 | 2 | 3 | 4; }
const labels = ["메뉴 찾기", "메뉴 선택", "주문 확인", "결제"];
export function OrderProgress({ current }: Props) { return <nav className="order-progress" aria-label="주문 진행 단계">{labels.map((label, index) => <div className={index + 1 === current ? "current" : index + 1 < current ? "done" : ""} key={label}><span>{index + 1 < current ? "✓" : index + 1}</span><strong>{label}</strong>{index + 1 === current && <em>현재 단계</em>}</div>)}</nav>; }
