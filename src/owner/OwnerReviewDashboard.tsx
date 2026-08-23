import { useEffect, useMemo, useReducer, useState } from "react";
import { ownerDemoStores } from "../data/ownerDemoStores";
import { loadStoreData } from "../data/storeLoader";
import { applyOwnerOverride, confirmOwnerEstimate, enrichStoreData, reenrichStoreData, toFinalStoreData } from "../enrichment/enrichment";
import { createBrowserAttributeProvider } from "../enrichment/providerFactory";
import { getReviewQueue, getReviewRequiredAttributes } from "../enrichment/review";
import type { AttributeValue } from "../types/menu";
import type { EnrichedStoreData, EnrichedStoreMenu } from "../types/enrichment";
import type { AttributeDefinition } from "../types/store";
import { formatAttributeValue, getReviewChoices, sourceLabels } from "./reviewControls";
import { ownerReviewReducer } from "./ownerReviewReducer";
import { validateFinalStore } from "./validation";
import { clearOwnerReview, hydrateOwnerReview, saveOwnerReview } from "./persistence";
import "./owner.css";

interface EditorProps { store: EnrichedStoreData; menu: EnrichedStoreMenu; definitions: AttributeDefinition[]; onSave: (store: EnrichedStoreData) => void; }
function MenuReviewEditor({ store, menu, definitions, onSave }: EditorProps) {
  const [draft, setDraft] = useState<Record<string, AttributeValue>>(() => Object.fromEntries(definitions.map((definition) => [definition.key, menu.attributes[definition.key]])));
  function save() {
    let next = store;
    for (const definition of definitions) {
      next = draft[definition.key] === menu.attributes[definition.key]
        ? confirmOwnerEstimate(next, menu.id, definition.key)
        : applyOwnerOverride(next, menu.id, definition.key, draft[definition.key]);
    }
    onSave(next);
  }
  return <section className="owner-editor"><header><div><p className="owner-kicker">메뉴 검토</p><h2>{menu.name}</h2></div><strong>{menu.price.toLocaleString("ko-KR")}원</strong></header><dl className="raw-menu-info"><div><dt>설명</dt><dd>{menu.description || "입력된 설명 없음"}</dd></div><div><dt>카테고리</dt><dd>{menu.category || "미지정"}</dd></div><div><dt>옵션</dt><dd>{menu.options?.join(" / ") || "입력된 옵션 없음"}</dd></div></dl>
    <div className="review-fields">{definitions.map((definition) => { const metadata = menu.attributeMetadata[definition.key]; const choices = getReviewChoices(definition); return <fieldset key={definition.key}><legend>{definition.label}</legend><div className="estimate-summary"><span>현재 추정: <strong>{formatAttributeValue(menu.attributes[definition.key], definition)}</strong></span><span>신뢰도 <strong>{Math.round(metadata.confidence * 100)}%</strong></span><span>{metadata.confirmedByOwner ? "점주가 AI 추정값을 확인" : sourceLabels[metadata.source] ?? metadata.source}</span></div><p className="evidence">근거: {metadata.evidence || "추가 근거가 없습니다."}</p><div className="review-choice-list">{choices.map((choice) => { const selected = draft[definition.key] === choice.value; return <button type="button" aria-pressed={selected} className={selected ? "selected" : ""} onClick={() => setDraft({ ...draft, [definition.key]: choice.value })} key={`${definition.key}-${String(choice.value)}`}>{selected && <span>✓ </span>}{choice.label}{selected && <small>선택됨</small>}</button>; })}</div><button type="button" className="keep-estimate" onClick={() => setDraft({ ...draft, [definition.key]: menu.attributes[definition.key] })}>AI 추정값 그대로 확인</button></fieldset>; })}</div>
    <p className="confirm-note">값을 바꾸지 않고 저장하면 “AI 추정값 그대로 확인”으로 기록됩니다.</p><button className="owner-primary" onClick={save}>이 메뉴 검토 완료</button>
  </section>;
}

export default function OwnerReviewDashboard() {
  const [rawStoreId, setRawStoreId] = useState(ownerDemoStores[0].storeId);
  const [store, setStore] = useState<EnrichedStoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [ui, dispatch] = useReducer(ownerReviewReducer, { tab: "review", selectedMenuId: null, showJson: false });
  useEffect(() => { let active = true; setLoading(true); setAnalysisMessage(""); const raw = ownerDemoStores.find((item) => item.storeId === rawStoreId)!; const saved = hydrateOwnerReview(window.localStorage, rawStoreId); if (saved) { setStore(saved); setLoading(false); setAnalysisMessage("저장된 검토 내용을 복원했습니다."); return () => { active = false; }; } enrichStoreData(raw, createBrowserAttributeProvider()).then((result) => { if (active) { setStore(result); setLoading(false); setAnalysisMessage(`${result.menus.length}개 메뉴 분석 완료`); dispatch({ type: "TAB", tab: "review" }); } }); return () => { active = false; }; }, [rawStoreId]);
  useEffect(() => { if (store) saveOwnerReview(window.localStorage, store); }, [store]);
  const queue = useMemo(() => store ? getReviewQueue(store) : [], [store]);
  const unresolved = store ? getReviewRequiredAttributes(store) : [];
  const availableMenus = ui.tab === "review" ? queue.map((item) => item.menu) : store?.menus ?? [];
  const selectedId = availableMenus.some((menu) => menu.id === ui.selectedMenuId) ? ui.selectedMenuId : availableMenus[0]?.id ?? null;
  const selectedMenu = store?.menus.find((menu) => menu.id === selectedId);
  const definitions = selectedMenu && store ? (ui.tab === "review" ? queue.find((item) => item.menu.id === selectedMenu.id)?.items.map((item) => store.attributes.find((definition) => definition.key === item.attribute)!).filter(Boolean) ?? [] : store.attributes) : [];
  const validation = store ? validateFinalStore(store) : null;
  const reviewedMenus = store ? store.menus.filter((menu) => !Object.values(menu.attributeMetadata).some((metadata) => metadata.needsReview)).length : 0;

  function exportJson() {
    if (!store || !validation?.valid) return;
    if (validation.unresolvedCount && !window.confirm(`확인이 필요한 항목이 ${validation.unresolvedCount}개 남아 있습니다. 그래도 내보내시겠어요?`)) return;
    const blob = new Blob([JSON.stringify(toFinalStoreData(store), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${store.storeId}-enriched-store.json`; link.click(); URL.revokeObjectURL(url);
  }

  async function analyzeAgain() {
    if (!store) return; setLoading(true); setAnalysisMessage("메뉴를 분석하고 있습니다.");
    const raw = ownerDemoStores.find((item) => item.storeId === rawStoreId)!;
    const result = await reenrichStoreData(raw, store, createBrowserAttributeProvider());
    setStore(result); setLoading(false); const remaining = getReviewRequiredAttributes(result).length;
    const fallbackUsed = result.menus.some((menu) => Object.values(menu.attributeMetadata).some((metadata) => metadata.evidence?.includes("fallback") || metadata.evidence?.includes("unavailable")));
    setAnalysisMessage(fallbackUsed ? `일부 메뉴를 자동 분석하지 못했습니다 · 확인 필요한 속성 ${remaining}개` : `${result.menus.length}개 메뉴 분석 완료 · 검토가 필요한 속성 ${remaining}개`);
  }

  async function resetSavedReview() {
    if (!window.confirm("저장된 검토 내용을 지우고 처음부터 다시 분석할까요?")) return;
    clearOwnerReview(window.localStorage, rawStoreId); setLoading(true);
    const raw = ownerDemoStores.find((item) => item.storeId === rawStoreId)!;
    const result = await enrichStoreData(raw, createBrowserAttributeProvider()); setStore(result); setLoading(false); setAnalysisMessage("저장 내용을 초기화하고 다시 분석했습니다.");
  }

  if (loading || !store) return <main className="owner-loading" aria-live="polite">메뉴 속성을 분석하고 있습니다…</main>;
  const finalCatalog = validation?.valid ? loadStoreData(toFinalStoreData(store)) : null;
  return <div className="owner-app"><header className="owner-topbar"><div><p>Easy Order · Owner</p><h1>메뉴 속성 검토</h1></div><label>검토할 매장<select value={rawStoreId} onChange={(event) => setRawStoreId(event.target.value)}>{ownerDemoStores.map((item) => <option value={item.storeId} key={item.storeId}>{item.storeName}</option>)}</select></label><a href="/">키오스크 화면</a></header>
    <main className="owner-main"><section className="owner-summary"><div><span>매장</span><strong>{store.storeName}</strong></div><div><span>전체 메뉴</span><strong>{store.menus.length}</strong></div><div><span>검토 완료</span><strong>{reviewedMenus}</strong></div><div className={unresolved.length ? "attention" : "complete"}><span>확인 필요한 속성</span><strong>{unresolved.length}</strong></div></section>
      <section className="analysis-toolbar" aria-live="polite"><div><strong>{analysisMessage || "분석 준비 완료"}</strong><span>점주가 확정한 값은 재분석해도 유지됩니다.</span></div><button onClick={analyzeAgain}>AI 분석 다시 실행</button><button onClick={resetSavedReview}>저장된 검토 내용 초기화</button></section>
      <nav className="owner-tabs" aria-label="검토 화면"><button className={ui.tab === "review" ? "active" : ""} onClick={() => dispatch({ type: "TAB", tab: "review" })}>검토 필요한 항목</button><button className={ui.tab === "all" ? "active" : ""} onClick={() => dispatch({ type: "TAB", tab: "all" })}>전체 메뉴 보기</button><button className={ui.tab === "preview" ? "active" : ""} onClick={() => dispatch({ type: "TAB", tab: "preview" })}>최종 데이터 미리보기</button></nav>
      {ui.tab !== "preview" && <div className="owner-workspace"><aside><h2>{ui.tab === "review" ? `우선 검토 Queue (${queue.length})` : `전체 메뉴 (${store.menus.length})`}</h2><div>{(ui.tab === "review" ? queue.map((item) => item.menu) : store.menus).map((menu) => <button className={menu.id === selectedId ? "selected" : ""} onClick={() => dispatch({ type: "SELECT_MENU", menuId: menu.id })} key={menu.id}><strong>{menu.name}</strong><span>{Object.values(menu.attributeMetadata).filter((metadata) => metadata.needsReview).length}개 확인 필요</span></button>)}</div></aside>{selectedMenu && definitions.length ? <MenuReviewEditor key={`${selectedMenu.id}-${ui.tab}`} store={store} menu={selectedMenu} definitions={definitions} onSave={setStore} /> : <section className="owner-empty"><h2>검토가 완료되었습니다.</h2><p>모든 낮은 신뢰도 속성을 확인했어요.</p><button className="owner-primary" onClick={() => dispatch({ type: "TAB", tab: "preview" })}>최종 Store 데이터 확인</button></section>}</div>}
      {ui.tab === "preview" && validation && <section className="owner-preview"><h2>최종 Store 데이터</h2><div className="preview-grid"><div><span>메뉴</span><strong>{store.menus.length}개</strong></div><div><span>속성</span><strong>{store.attributes.length}개</strong></div><div><span>미확인</span><strong>{validation.unresolvedCount}개</strong></div><div><span>생성 질문</span><strong>{validation.questionCount}개</strong></div></div>{validation.errors.map((error) => <p className="validation-error" key={error}>오류: {error}</p>)}{validation.warnings.map((warning) => <p className="validation-warning" key={warning}>확인: {warning}</p>)}<div className="preview-actions"><button className="owner-primary" disabled={!validation.valid} onClick={exportJson}>JSON 파일로 내보내기</button><button onClick={() => dispatch({ type: "TOGGLE_JSON" })}>{ui.showJson ? "JSON 닫기" : "개발자용 JSON 보기"}</button></div>{finalCatalog && <details className="recommendation-preview"><summary>이 메뉴 데이터로 추천 테스트</summary><p>기존 Store Loader와 Question Generator 연결 성공</p><ul>{finalCatalog.questions.slice(0, 6).map((question) => <li key={question.id}>{question.text}</li>)}</ul></details>}{ui.showJson && <pre>{JSON.stringify(toFinalStoreData(store), null, 2)}</pre>}</section>}
    </main></div>;
}
