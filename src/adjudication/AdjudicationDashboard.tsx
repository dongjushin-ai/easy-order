import { useMemo, useState } from "react";
import { KOREAN_SNACK_DATASET_VERSION } from "../evaluation/koreanSnackDataset";
import { koreanSnackStoreDataset } from "../evaluation/koreanSnackDataset";
import snackStress from "../../evaluation-results/stress-tests/snack20-v1-stress-test.json";
import {
  ANCHORS,
  calculateAgreement,
  CONFIDENCE_WEIGHT,
  proposeRange,
  reviewKey,
  semanticsFor,
  statusFor,
} from "./core";
import { exportCsv, importCsv } from "./csv";
import {
  diffMarkdown,
  generateSnackV2,
  humanAgreementByAttribute,
} from "./generator";
import {
  loadAll,
  loadAssessments,
  loadDecisions,
  resetRater,
  saveAssessments,
  saveDecisions,
  upsertAssessment,
} from "./storage";
import {
  RATER_IDS,
  type AdjudicationStatus,
  type AgreementMetrics,
  type ConfidenceLevel,
  type FinalDecision,
  type FinalReason,
  type RaterAssessment,
  type RaterId,
  type ReviewItem,
  type ValueRange,
} from "./types";
import { filterStressQueue, importStressQueue, type QueueReason, type StressPayload } from "./stressQueue";
import "./adjudication.css";
const raters = { A: "Rater A", B: "Rater B", C: "Rater C" };
const download = (name: string, text: string, type = "text/plain") => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};
export default function AdjudicationDashboard() {
  const query = new URLSearchParams(location.search).get(
    "rater",
  ) as RaterId | null;
  const [rater, setRater] = useState<RaterId>(
    RATER_IDS.includes(query as RaterId) ? (query as RaterId) : "A",
  );
  const [all, setAll] = useState(() => loadAll());
  const [decisions, setDecisions] = useState(loadDecisions);
  const [index, setIndex] = useState(0);
  const [min, setMin] = useState<number>(0.5);
  const [max, setMax] = useState<number>(0.5);
  const [confidence, setConfidence] = useState<ConfidenceLevel>("MEDIUM");
  const [note, setNote] = useState("");
  const [tab, setTab] = useState<"rate" | "final">("rate");
  const [message, setMessage] = useState("");
  const [statusFilter,setStatusFilter]=useState<"ALL"|"QUESTIONABLE"|"UNRESOLVED">("ALL");
  const [tierFilter,setTierFilter]=useState<"ALL"|"A"|"B"|"C">("ALL");
  const [attributeFilter,setAttributeFilter]=useState("ALL");
  const [reasonFilter,setReasonFilter]=useState<"ALL"|QueueReason>("ALL");
  const [showStable,setShowStable]=useState(false);
  const stressItems=useMemo(()=>importStressQueue(snackStress as unknown as StressPayload,koreanSnackStoreDataset),[]);
  const queue=useMemo(()=>filterStressQueue(stressItems,{showStable,status:statusFilter==="ALL"?undefined:statusFilter,tier:tierFilter==="ALL"?undefined:tierFilter,attribute:attributeFilter==="ALL"?undefined:attributeFilter,reason:reasonFilter==="ALL"?undefined:reasonFilter}),[stressItems,statusFilter,tierFilter,attributeFilter,reasonFilter,showStable]);
  const safeIndex=Math.min(index,Math.max(0,queue.length-1));
  const item = queue[safeIndex];
  const current = all[rater];
  const complete = RATER_IDS.every(
    (r) => queue.every(i=>all[r].some(a=>reviewKey(a.menuId,a.attributeId)===reviewKey(i.menuId,i.attributeId))),
  );
  if(!item)return <main className="adj-shell"><h1>조건에 맞는 검토 항목이 없습니다.</h1><button onClick={()=>{setStatusFilter("ALL");setTierFilter("ALL");setAttributeFilter("ALL");setReasonFilter("ALL")}}>필터 초기화</button></main>;
  const semantics = semanticsFor(item.attributeId);
  const progress = Object.fromEntries(
    RATER_IDS.map((r) => [r, all[r].length]),
  ) as Record<RaterId, number>;
  const save = () => {
    const next: RaterAssessment = {
      datasetVersion: KOREAN_SNACK_DATASET_VERSION,
      menuId: item.menuId,
      attributeId: item.attributeId,
      raterId: rater,
      valueMin: min,
      valueMax: max,
      confidenceLevel: confidence,
      confidence: CONFIDENCE_WEIGHT[confidence],
      note: note || undefined,
      updatedAt: new Date().toISOString(),
    };
    const xs = upsertAssessment(current, next);
    saveAssessments(rater, xs);
    setAll({ ...all, [rater]: xs });
    setIndex(Math.min(safeIndex + 1, queue.length - 1));
    setMin(0.5);
    setMax(0.5);
    setNote("");
    setMessage("저장했습니다.");
  };
  const existing = current.find(
    (a) =>
      reviewKey(a.menuId, a.attributeId) ===
      reviewKey(item.menuId, item.attributeId),
  );
  const results = useMemo(
    () =>
      queue.map((i) => {
        const xs = RATER_IDS.map((r) =>
          all[r].find(
            (a) =>
              reviewKey(a.menuId, a.attributeId) ===
              reviewKey(i.menuId, i.attributeId),
          ),
        ).filter((x): x is RaterAssessment => !!x);
        const agreement = calculateAgreement(xs);
        const decision = decisions.find(
          (d) =>
            reviewKey(d.menuId, d.attributeId) ===
            reviewKey(i.menuId, i.attributeId),
        );
        return {
          item: i,
          xs,
          agreement,
          proposed: agreement ? proposeRange(agreement) : null,
          status: statusFor(xs, decision),
          decision,
        };
      }),
    [all, decisions, queue],
  );
  const decide = (
    i: number,
    mode: FinalDecision["mode"],
    reason: FinalReason,
    custom?: { min: number; max: number },
  ) => {
    const x = results[i];
    if (!x.agreement || !x.proposed) return;
    const range =
      mode === "RETAIN"
        ? x.item.existingRange
        : mode === "CUSTOM" && custom
          ? custom
          : x.proposed;
    const next: FinalDecision = {
      menuId: x.item.menuId,
      attributeId: x.item.attributeId,
      mode,
      range,
      reason,
      decidedAt: new Date().toISOString(),
    };
    const ds = [
      ...decisions.filter(
        (d) =>
          reviewKey(d.menuId, d.attributeId) !==
          reviewKey(next.menuId, next.attributeId),
      ),
      next,
    ];
    saveDecisions(ds);
    setDecisions(ds);
  };
  return (
    <main className="adj-shell">
      <header>
        <div>
          <p>HUMAN GROUND TRUTH</p>
          <h1>Snack Ground Truth Review</h1>
        </div>
        <nav>
          <button onClick={() => setTab("rate")}>독립 평가</button>
          <button onClick={() => setTab("final")} disabled={!complete}>
            최종 판정
          </button>
        </nav>
      </header>
      <section className="queue-filters" aria-label="Stress test queue filters">
        <strong>Stress Test Review Queue</strong>
        <select aria-label="Status" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value as typeof statusFilter);setIndex(0)}}><option value="ALL">All Review Required</option><option>QUESTIONABLE</option><option>UNRESOLVED</option></select>
        <select aria-label="Tier" value={tierFilter} onChange={e=>{setTierFilter(e.target.value as typeof tierFilter);setIndex(0)}}><option value="ALL">All tiers</option><option value="A">Tier A</option><option value="B">Tier B</option><option value="C">Tier C</option></select>
        <select aria-label="Attribute" value={attributeFilter} onChange={e=>{setAttributeFilter(e.target.value);setIndex(0)}}><option value="ALL">All attributes</option>{[...new Set(stressItems.map(x=>x.attributeId))].map(x=><option key={x}>{x}</option>)}</select>
        <select aria-label="Reason" value={reasonFilter} onChange={e=>{setReasonFilter(e.target.value as typeof reasonFilter);setIndex(0)}}><option value="ALL">All reasons</option>{[...new Set(stressItems.flatMap(x=>x.reasons))].map(x=><option key={x}>{x}</option>)}</select>
        <label><input type="checkbox" checked={showStable} onChange={e=>{setShowStable(e.target.checked);setIndex(0)}}/> Show Stable (Provisionally Stable)</label>
      </section>
      <section className="adj-progress">
        {RATER_IDS.map((r) => (
          <button
            className={r === rater ? "active" : ""}
            onClick={() => {
              setRater(r);
              setIndex(0);
            }}
            key={r}
          >
            <strong>{raters[r]}</strong>
            <span>
              {queue.filter(i=>all[r].some(a=>reviewKey(a.menuId,a.attributeId)===reviewKey(i.menuId,i.attributeId))).length} / {queue.length}
            </span>
          </button>
        ))}
      </section>
      {tab === "rate" ? (
        <section className="rating-card">
          <div className="rating-head">
            <span>
              {safeIndex + 1} / {queue.length}
            </span>
            <select
              value={safeIndex}
              onChange={(e) => setIndex(Number(e.target.value))}
            >
              {queue.map((x, i) => (
                <option value={i} key={reviewKey(x.menuId, x.attributeId)}>
                  {i + 1}. {x.menuName} · {x.attributeId}
                  {current.some(
                    (a) =>
                      reviewKey(a.menuId, a.attributeId) ===
                      reviewKey(x.menuId, x.attributeId),
                  )
                    ? " ✓"
                    : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="stress-metadata"><strong>{item.stressStatus}</strong><span>Tier {item.attributeTier}</span><span>Stability {item.stabilityScore.toFixed(3)}</span><span>Spread {item.predictionSpread.toFixed(2)}</span><span>{item.reasons.join(" · ")}</span>{item.stressStatus==="STABLE"&&<em>Provisionally Stable · Pending Human Validation</em>}</div>
          <p className="blind-badge">Blind mode · AI 예측과 기존 정답은 숨김</p>
          <h2>{item.menuName}</h2>
          <p className="description">{item.description}</p>
          <h3>평가 속성: {item.attributeId}</h3>
          <p>{semantics?.definition}</p>
          <div className="anchors">
            {ANCHORS.map((v) => (
              <button
                key={v}
                className={min === v && max === v ? "selected" : ""}
                onClick={() => {
                  setMin(v);
                  setMax(v);
                }}
              >
                <strong>{v}</strong>
                <span>
                  {
                    semantics?.anchors[
                      String(v) as keyof typeof semantics.anchors
                    ]
                  }
                </span>
              </button>
            ))}
          </div>
          <label className="range-row">
            선택 범위{" "}
            <select
              value={`${min}-${max}`}
              onChange={(e) => {
                const [a, b] = e.target.value.split("-").map(Number);
                setMin(a);
                setMax(b);
              }}
            >
              {ANCHORS.map((v) => (
                <option key={v} value={`${v}-${v}`}>
                  {v}
                </option>
              ))}
              {ANCHORS.slice(0, -1).map((v, i) => (
                <option key={`${v}r`} value={`${v}-${ANCHORS[i + 1]}`}>
                  {v} ~ {ANCHORS[i + 1]}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>평가 확신도</legend>
            {(["HIGH", "MEDIUM", "LOW"] as const).map((c) => (
              <button
                className={confidence === c ? "selected" : ""}
                onClick={() => setConfidence(c)}
                key={c}
              >
                {c} ({CONFIDENCE_WEIGHT[c]})
              </button>
            ))}
          </fieldset>
          <label>
            선택 근거 메모 (선택)
            <textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button className="primary" onClick={save}>
            저장하고 다음
          </button>
          {existing && (
            <p>
              이 항목은 저장되어 있습니다. 다시 저장하면 현재 평가자 데이터만
              갱신됩니다.
            </p>
          )}
          {message && <output>{message}</output>}
          <div className="data-tools">
            <button
              onClick={() =>
                download(
                  `${rater}-${KOREAN_SNACK_DATASET_VERSION}.csv`,
                  exportCsv(current),
                  "text/csv",
                )
              }
            >
              CSV 내보내기
            </button>
            <label>
              CSV 가져오기
              <input
                type="file"
                accept=".csv"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const xs = importCsv(await f.text(), rater);
                    saveAssessments(rater, xs);
                    setAll({ ...all, [rater]: xs });
                    setMessage(`${xs.length}건을 가져왔습니다.`);
                  } catch (error) {
                    setMessage(
                      error instanceof Error ? error.message : "가져오기 실패",
                    );
                  }
                }}
              />
            </label>
            <button
              className="danger"
              onClick={() => {
                if (confirm(`${raters[rater]} 평가를 모두 초기화할까요?`)) {
                  resetRater(rater);
                  setAll({ ...all, [rater]: [] });
                }
              }}
            >
              현재 평가자 초기화
            </button>
          </div>
        </section>
      ) : (
        <FinalPanel
          results={results}
          decisions={decisions}
          decide={decide}
          assessments={Object.values(all).flat()}
        />
      )}
    </main>
  );
}
interface UiResult {
  item: ReviewItem;
  xs: RaterAssessment[];
  agreement: AgreementMetrics | null;
  proposed: ValueRange | null;
  status: AdjudicationStatus;
  decision: FinalDecision | undefined;
}
function FinalPanel({
  results,
  decisions,
  decide,
  assessments,
}: {
  results: UiResult[];
  decisions: FinalDecision[];
  decide: (
    i: number,
    m: FinalDecision["mode"],
    r: FinalReason,
    c?: { min: number; max: number },
  ) => void;
  assessments: RaterAssessment[];
}) {
  const [reason, setReason] = useState<FinalReason>("HUMAN_CONSENSUS");
  const stats = humanAgreementByAttribute(assessments);
  return (
    <section className="final-panel">
      <div className="summary">
        <strong>
          최종 판정 {decisions.length} / {results.length}
        </strong>
        <pre>{JSON.stringify(stats, null, 2)}</pre>
      </div>
      {results.map((x, i) => (
        <article
          key={reviewKey(x.item.menuId, x.item.attributeId)}
          className={x.agreement?.level === "LOW" ? "low" : ""}
        >
          <h2>
            {x.item.menuName} · {x.item.attributeId}
          </h2>
          <p>
            평가:{" "}
            {x.xs
              .map((a) => `${a.raterId} ${a.valueMin}–${a.valueMax}`)
              .join(" / ")}
          </p>
          <p>
            합의 {x.agreement?.level} · spread {x.agreement?.spread.toFixed(2)}{" "}
            · median {x.agreement?.median.toFixed(2)} · 표준편차{" "}
            {x.agreement?.standardDeviation.toFixed(3)} · 가중평균{" "}
            {x.agreement?.weightedMean.toFixed(2)}
          </p>
          <p>
            제안 {x.proposed?.min}–{x.proposed?.max} / 기존{" "}
            {x.item.existingRange.min}–{x.item.existingRange.max}
          </p>
          <details>
            <summary>판정 단계 참고 자료 보기</summary>
            <p>
              Luna {x.item.luna ?? "-"} · Terra {x.item.terra ?? "-"}
            </p>
            <p>충돌: {x.item.conflictTypes.join(", ") || "Tier C 정기 검토"}</p>
          </details>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as FinalReason)}
          >
            <option>HUMAN_CONSENSUS</option>
            <option>DEFINITION_REFINEMENT</option>
            <option>SOURCE_VERIFICATION</option>
            <option>RANGE_TOO_NARROW</option>
            <option>OTHER</option>
          </select>
          <div className="decision-buttons">
            <button onClick={() => decide(i, "RETAIN", reason)}>
              기존 유지
            </button>
            <button onClick={() => decide(i, "APPLY_PROPOSED", reason)}>
              제안 적용
            </button>
            <button
              onClick={() => {
                const raw = prompt(
                  "직접 범위 min,max",
                  `${x.proposed?.min},${x.proposed?.max}`,
                );
                if (!raw) return;
                const [min, max] = raw.split(",").map(Number);
                if (min >= 0 && max <= 1 && min <= max)
                  decide(i, "CUSTOM", reason, { min, max });
              }}
            >
              직접 범위
            </button>
          </div>
          {x.decision && (
            <strong>
              FINALIZED: {x.decision.range.min}–{x.decision.range.max} (
              {x.decision.reason})
            </strong>
          )}
        </article>
      ))}
      <div className="artifact-tools">
        <button
          disabled={decisions.length !== results.length}
          onClick={() =>
            download(
              "snack20-v2.json",
              JSON.stringify(generateSnackV2(decisions), null, 2),
              "application/json",
            )
          }
        >
          snack20-v2 다운로드
        </button>
        <button
          disabled={decisions.length !== results.length}
          onClick={() =>
            download(
              "snack20-v1-to-v2-diff.md",
              diffMarkdown(generateSnackV2(decisions), decisions, assessments),
            )
          }
        >
          v1→v2 diff 다운로드
        </button>
      </div>
    </section>
  );
}
