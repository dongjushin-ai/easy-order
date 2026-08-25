import { useEffect, useMemo, useRef, useState } from "react";
import { loadStoreData } from "../data/storeLoader";
import {
  applyOwnerOverride,
  confirmOwnerEstimate,
  enrichStoreData,
  toFinalStoreData,
} from "../enrichment/enrichment";
import { MockAttributeProvider } from "../enrichment/MockAttributeProvider";
import { createBrowserAttributeProvider } from "../enrichment/providerFactory";
import { getReviewRequiredAttributes } from "../enrichment/review";
import type { AttributeValue } from "../types/menu";
import type { AttributeDefinition, RawStoreMenu } from "../types/store";
import { DEMO_MODE } from "../demo/demoState";
import { SAMPLE_MENU_CSV } from "../demo/sampleMenus";
import { userFacingError } from "./errors";
import {
  CSV_TEMPLATE,
  importMenuCsv,
  importMenuJson,
  importStoreJson,
  validateImportedMenus,
} from "./menuImport";
import { exportStoreJson, LocalStoreRepository } from "./repository";
import {
  createCustomNumericAttribute,
  isSubjectiveAttribute,
  schemaPresets,
  suggestSchemaPreset,
} from "./schemaPresets";
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_LABELS,
  type MenuImportIssue,
  type MenuImportPreview,
  type OnboardingStep,
  type OnboardingStoreRecord,
} from "./types";
import "./onboarding.css";

const MAX_NAME = 60,
  repo = () => new LocalStoreRepository(localStorage);
const download = (name: string, text: string, type: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};
const indexOf = (step: OnboardingStep) => ONBOARDING_STEPS.indexOf(step);

export default function StoreOnboardingWizard() {
  const params = new URLSearchParams(location.search),
    resume = params.get("id"),
    demo = params.get("demo") === "1",
    initial = resume ? repo().get(resume) : undefined;
  const [record, setRecord] = useState<OnboardingStoreRecord | undefined>(
      initial,
    ),
    [name, setName] = useState(initial?.info.name ?? ""),
    [category, setCategory] = useState(initial?.info.category ?? "Other"),
    [description, setDescription] = useState(initial?.info.description ?? "");
  const [preview, setPreview] = useState<MenuImportPreview | null>(null),
    [message, setMessage] = useState(""),
    [nameError, setNameError] = useState(""),
    [isAnalyzing, setIsAnalyzing] = useState(false),
    [savedAt, setSavedAt] = useState(initial?.updatedAt ?? "");
  const lock = useRef(false),
    [custom, setCustom] = useState({
      name: "",
      meaning: "",
      low: "",
      medium: "",
      high: "",
      question: "",
    }),
    step = record?.step ?? "STORE_INFO";
  const persist = (next: OnboardingStoreRecord) => {
      try {
        repo().save(next);
        setRecord(next);
        setSavedAt(new Date().toISOString());
      } catch (e) {
        setMessage(userFacingError(e, "SAVE"));
      }
    },
    go = (next: OnboardingStep) => record && persist({ ...record, step: next });
  const catalog = useMemo(() => {
    try {
      return record?.finalStore ? loadStoreData(record.finalStore) : null;
    } catch {
      return null;
    }
  }, [record]);
  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => {
      if (!record && (name || description)) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    addEventListener("beforeunload", fn);
    return () => removeEventListener("beforeunload", fn);
  }, [record, name, description]);
  function create() {
    const clean = name.trim();
    if (!clean) return setNameError("매장 이름을 입력해 주세요.");
    if (clean.length > MAX_NAME)
      return setNameError(`매장 이름은 ${MAX_NAME}자 이내로 입력해 주세요.`);
    const made = repo().create({name:clean,category,description:description.trim()},{demoCreated:demo});
    persist({ ...made, step: "MENU_IMPORT" });
    history.replaceState(null, "", `/owner/new?id=${made.id}`);
  }
  const setMenus = (menus: RawStoreMenu[]) =>
    record &&
    persist({
      ...record,
      rawStore: { ...record.rawStore, menus },
      enrichedStore: undefined,
      finalStore: undefined,
    });
  async function analyze() {
    if (!record || lock.current) return;
    lock.current = true;
    setIsAnalyzing(true);
    setMessage("메뉴를 분석하고 있습니다…");
    try {
      const enriched = await enrichStoreData(
        record.rawStore,
        createBrowserAttributeProvider(),
      );
      persist({
        ...record,
        enrichedStore: enriched,
        finalStore: undefined,
        step: "REVIEW",
      });
      setMessage(
        `자동 분석 완료 · 직접 확인할 항목 ${getReviewRequiredAttributes(enriched).length}개`,
      );
    } catch (e) {
      setMessage(userFacingError(e, "ANALYZE"));
      try {
        const enriched = await enrichStoreData(
          record.rawStore,
          new MockAttributeProvider(),
        );
        persist({
          ...record,
          enrichedStore: enriched,
          finalStore: undefined,
          step: "REVIEW",
        });
      } catch (f) {
        setMessage(userFacingError(f, "ANALYZE"));
      }
    } finally {
      lock.current = false;
      setIsAnalyzing(false);
    }
  }
  const unresolved = record?.enrichedStore
      ? getReviewRequiredAttributes(record.enrichedStore)
      : [],
    current = unresolved[0],
    definition = current
      ? record?.enrichedStore?.attributes.find(
          (a) => a.key === current.attribute,
        )
      : undefined;
  function review(value?: AttributeValue) {
    if (!record?.enrichedStore || !current) return;
    const enriched =
      value === undefined
        ? confirmOwnerEstimate(
            record.enrichedStore,
            current.menuId,
            current.attribute,
          )
        : applyOwnerOverride(
            record.enrichedStore,
            current.menuId,
            current.attribute,
            value,
          );
    persist({ ...record, enrichedStore: enriched });
  }
  function finishReview() {
    if (!record?.enrichedStore) return;
    if (unresolved.length)
      return setMessage(`${unresolved.length}개 항목을 먼저 확인해 주세요.`);
    persist({
      ...record,
      finalStore: toFinalStoreData(record.enrichedStore),
      step: "PREVIEW",
    });
  }
  return (
    <main className="wizard">
      <header>
        <a href="/owner">← 매장 관리</a>
        <h1>{record?.info.name ?? "새 매장 만들기"}</h1>
        {(demo || record?.demoCreated) && <p className="demo-helper"><strong>점주 체험 안내</strong> · 현재 단계의 안내를 따라 입력해 보세요. 모든 변경은 이 브라우저에 자동 저장됩니다.</p>}
        <ol className="wizard-progress" aria-label="매장 설정 진행 단계">
          {ONBOARDING_STEPS.map((s, i) => {
            const state =
              i < indexOf(step)
                ? "완료"
                : i === indexOf(step)
                  ? "현재"
                  : "예정";
            return (
              <li
                className={state}
                key={s}
                aria-current={state === "현재" ? "step" : undefined}
              >
                <span aria-hidden="true">{state === "완료" ? "✓" : i + 1}</span>
                <strong>{ONBOARDING_STEP_LABELS[s]}</strong>
                <small>{state}</small>
              </li>
            );
          })}
        </ol>
        {record && (
          <p className="save-status" role="status">
            ✓ 자동 저장됨
            {savedAt &&
              ` · ${new Date(savedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`}
          </p>
        )}
        {import.meta.env.DEV && record && (
          <details className="diagnostics">
            <summary>개발 진단 정보</summary>
            <code>
              storeId={record.id} · step={step} · provider=
              {import.meta.env.VITE_ATTRIBUTE_PROVIDER ?? "mock"} · savedAt=
              {savedAt}
            </code>
          </details>
        )}
      </header>
      {repo().issues().length > 0 && (
        <section className="recovery" role="alert">
          <h2>저장 데이터 복구가 필요합니다</h2>
          {repo()
            .issues()
            .map((x) => (
              <p key={x.type}>{x.message}</p>
            ))}
          <p>
            JSON 백업이 있다면 새 매장 화면에서 복원할 수 있습니다. 삭제 전에는
            원본이 유지됩니다.
          </p>
          <button
            onClick={() => {
              repo().clearInvalidData();
              location.reload();
            }}
          >
            읽을 수 없는 데이터 삭제
          </button>
        </section>
      )}
      {step === "STORE_INFO" && (
        <section>
          <h2>매장 기본 정보</h2>
          <p>고객 화면에 표시할 정보를 입력해 주세요.</p>
          <label htmlFor="store-name">매장 이름 *</label>
          <input
            id="store-name"
            value={name}
            maxLength={MAX_NAME + 1}
            aria-invalid={!!nameError}
            aria-describedby={nameError ? "name-error" : "name-help"}
            onChange={(e) => {
              setName(e.target.value);
              setNameError("");
            }}
          />
          <small id="name-help">공백을 제외하고 {MAX_NAME}자 이내</small>
          {nameError && (
            <p id="name-error" className="field-error" role="alert">
              {nameError}
            </p>
          )}
          <label htmlFor="category">업종</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {["Cafe", "Korean Snack", "Fast Food", "Restaurant", "Other"].map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
          </select>
          <label htmlFor="description">매장 설명</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button className="primary" onClick={create}>
            저장하고 메뉴 입력
          </button>
          <label>
            매장 JSON에서 복원
            <input
              type="file"
              accept=".json"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const raw = importStoreJson(await f.text()),
                    made = repo().create({
                      name: raw.storeName,
                      category: "Other",
                    });
                  persist({
                    ...made,
                    rawStore: { ...raw, storeId: made.id },
                    step: "MENU_IMPORT",
                  });
                  history.replaceState(null, "", `/owner/new?id=${made.id}`);
                } catch (err) {
                  setMessage(userFacingError(err, "IMPORT"));
                }
              }}
            />
          </label>
        </section>
      )}
      {step === "MENU_IMPORT" && record && (
        <section>
          <h2>메뉴 입력</h2>
          <p>오류가 있어도 정상 메뉴와 기존 메뉴는 유지됩니다.</p>
          {(demo || record.demoCreated) && <aside className="demo-helper"><strong>체험 안내:</strong> 직접 파일을 고르지 않아도 아래 샘플로 다음 단계를 체험할 수 있습니다.<div className="button-row"><button onClick={()=>setPreview(importMenuCsv(SAMPLE_MENU_CSV.cafe))}>Cafe 샘플 불러오기</button><button onClick={()=>setPreview(importMenuCsv(SAMPLE_MENU_CSV.snack))}>Snack 샘플 불러오기</button><button onClick={()=>setPreview(importMenuCsv(SAMPLE_MENU_CSV.fastfood))}>Fast Food 샘플 불러오기</button></div></aside>}
          <div className="import-actions">
            <button
              onClick={() =>
                download(
                  "easy-order-menu-template.csv",
                  CSV_TEMPLATE,
                  "text/csv",
                )
              }
            >
              CSV 양식 받기
            </button>
            <Upload
              label="CSV 업로드"
              accept=".csv"
              read={(text) => setPreview(importMenuCsv(text))}
              onError={(e) => setMessage(userFacingError(e, "IMPORT"))}
            />
            <Upload
              label="JSON 업로드"
              accept=".json"
              read={(text) => setPreview(importMenuJson(text))}
              onError={(e) => setMessage(userFacingError(e, "IMPORT"))}
            />
          </div>
          {preview && (
            <div className="import-preview">
              <h3>가져오기 결과</h3>
              <p>
                <strong>총 {preview.total}개</strong> · 정상{" "}
                {preview.valid.length}개 · 확인 필요 {preview.issues.length}개
              </p>
              {preview.issues.map((issue) => (
                <IssueEditor
                  key={`${issue.row}-${issue.message}`}
                  issue={issue}
                  existing={record.rawStore.menus}
                  onAdd={(menu) => {
                    setMenus([...record.rawStore.menus, menu]);
                    setPreview({
                      ...preview,
                      issues: preview.issues.filter((x) => x !== issue),
                    });
                  }}
                  onReplace={(menu) => {
                    setMenus(record.rawStore.menus.map((currentMenu) =>
                      currentMenu.name.trim().toLowerCase() === menu.name.trim().toLowerCase()
                        ? { ...currentMenu, ...menu, id: currentMenu.id }
                        : currentMenu,
                    ));
                    setPreview({ ...preview, issues: preview.issues.filter((x) => x !== issue) });
                  }}
                  onCancel={() => setPreview({ ...preview, issues: preview.issues.filter((x) => x !== issue) })}
                />
              ))}
              <div className="button-row">
                <button
                  className="primary"
                  disabled={!preview.valid.length}
                  onClick={() => {
                    setMenus([...record.rawStore.menus, ...preview.valid]);
                    setPreview({ ...preview, valid: [] });
                  }}
                >
                  정상 메뉴 {preview.valid.length}개 가져오기
                </button>
                <button onClick={() => setPreview(null)}>다시 업로드</button>
              </div>
            </div>
          )}
          <MenuEditor menus={record.rawStore.menus} onChange={setMenus} />
          <Actions
            back={() => go("STORE_INFO")}
            backLabel="이전: 매장 정보"
            next={() => go("SCHEMA")}
            nextLabel="다음: 추천 기준"
            disabled={!record.rawStore.menus.length}
          />
        </section>
      )}
      {step === "SCHEMA" && record && (
        <section>
          <h2>추천 기준</h2>
          {(demo || record.demoCreated) && <p className="demo-helper"><strong>체험 안내:</strong> 고객에게 어떤 기준으로 질문할지 선택합니다. 업종 preset을 바로 사용할 수 있습니다.</p>}
          <p>어떤 기준으로 고객에게 메뉴를 추천할지 선택해 주세요.</p>
          <div className="preset-list">
            {schemaPresets.map((p) => (
              <button
                key={p.id}
                onClick={() =>
                  persist({
                    ...record,
                    rawStore: { ...record.rawStore, attributes: p.attributes },
                    enrichedStore: undefined,
                    finalStore: undefined,
                  })
                }
              >
                {p.label} 사용
              </button>
            ))}
          </div>
          {!record.rawStore.attributes.length && (
            <button
              onClick={() =>
                persist({
                  ...record,
                  rawStore: {
                    ...record.rawStore,
                    attributes: suggestSchemaPreset(record.info.category)
                      .attributes,
                  },
                })
              }
            >
              업종에 맞는 기준 사용
            </button>
          )}
          <div className="schema-list">
            {record.rawStore.attributes.map((a) => (
              <article key={a.key}>
                <div>
                  <strong>{a.label}</strong>
                  <p>{a.question}</p>
                  {a.reviewChoices && (
                    <small>
                      {a.reviewChoices.map((x) => x.label).join(" · ")}
                    </small>
                  )}
                  {isSubjectiveAttribute(a.key) && (
                    <p className="warning">
                      사람마다 기준이 달라 자동 분석 뒤 직접 확인할 내용이
                      많아질 수 있습니다.
                    </p>
                  )}
                </div>
                <button
                  onClick={() =>
                    persist({
                      ...record,
                      rawStore: {
                        ...record.rawStore,
                        attributes: record.rawStore.attributes.filter(
                          (x) => x.key !== a.key,
                        ),
                      },
                      enrichedStore: undefined,
                      finalStore: undefined,
                    })
                  }
                >
                  제거
                </button>
              </article>
            ))}
          </div>
          <fieldset>
            <legend>추천 기준 추가</legend>
            <p>낮음·보통·높음일 때의 상태를 구체적으로 적어 주세요.</p>
            {[
              { key: "name", label: "추천 기준 이름" },
              { key: "meaning", label: "이 기준이 뜻하는 것" },
              { key: "low", label: "낮을 때의 상태" },
              { key: "medium", label: "보통일 때의 상태" },
              { key: "high", label: "높을 때의 상태" },
              { key: "question", label: "고객에게 보여줄 질문" },
            ].map((x) => (
              <label key={x.key}>
                {x.label}
                <input
                  value={custom[x.key as keyof typeof custom]}
                  onChange={(e) =>
                    setCustom({ ...custom, [x.key]: e.target.value })
                  }
                />
              </label>
            ))}
            <button
              onClick={() => {
                try {
                  const a = createCustomNumericAttribute(custom);
                  persist({
                    ...record,
                    rawStore: {
                      ...record.rawStore,
                      attributes: [...record.rawStore.attributes, a],
                    },
                    enrichedStore: undefined,
                    finalStore: undefined,
                  });
                  setCustom({
                    name: "",
                    meaning: "",
                    low: "",
                    medium: "",
                    high: "",
                    question: "",
                  });
                } catch (e) {
                  setMessage(
                    e instanceof Error ? e.message : userFacingError(e),
                  );
                }
              }}
            >
              추천 기준 추가
            </button>
          </fieldset>
          <Actions
            back={() => go("MENU_IMPORT")}
            backLabel="이전: 메뉴"
            next={() => go("ENRICHMENT")}
            nextLabel="다음: 자동 분석"
            disabled={!record.rawStore.attributes.length}
          />
        </section>
      )}
      {step === "ENRICHMENT" && record && (
        <section>
          <h2>메뉴 자동 분석</h2>
          {(DEMO_MODE || record.demoCreated) && <p className="demo-helper"><strong>AI 분석 데모</strong> · 데모에서는 사전 정의된 분석 시뮬레이션을 사용하며 실제 모델 API를 호출하지 않습니다.</p>}
          <p>
            메뉴 {record.rawStore.menus.length}개와 추천 기준{" "}
            {record.rawStore.attributes.length}개, 총{" "}
            {record.rawStore.menus.length * record.rawStore.attributes.length}개
            항목을 살펴봅니다.
          </p>
          {isAnalyzing && <p role="status">분석 중…</p>}
          <Actions
            back={() => go("SCHEMA")}
            backLabel="이전: 추천 기준"
            next={analyze}
            nextLabel={isAnalyzing ? "분석 중…" : "메뉴 자동 분석 시작"}
            disabled={isAnalyzing}
          />
        </section>
      )}
      {step === "REVIEW" && record?.enrichedStore && (
        <section>
          <h2>분석 결과 확인</h2>
          <p>중요하고 불확실한 항목부터 보여드립니다.</p>
          <p>
            <strong>남은 항목 {unresolved.length}개</strong>
          </p>
          <progress
            value={
              record.enrichedStore.menus.length *
                record.enrichedStore.attributes.length -
              unresolved.length
            }
            max={
              record.enrichedStore.menus.length *
              record.enrichedStore.attributes.length
            }
            aria-label="검토 진행률"
          />
          {current && definition ? (
            <article className="review-card">
              <p>
                <strong>{current.menuName}</strong>의{" "}
                <strong>{definition.label}</strong>을 확인해 주세요.
              </p>
              <p>{definition.question}</p>
              <div className="choice-grid">
                {choices(definition).map((c) => (
                  <button key={c.label} onClick={() => review(c.value)}>
                    {c.label}
                  </button>
                ))}
              </div>
              <button onClick={() => review()}>현재 분석 결과가 맞음</button>
            </article>
          ) : (
            <p className="success">필수 확인 항목을 모두 처리했습니다.</p>
          )}
          <a
            className="button-link secondary"
            href={`/owner?store=${record.id}`}
          >
            상세 검토 화면 열기
          </a>
          <Actions
            back={() => go("ENRICHMENT")}
            backLabel="이전: 자동 분석"
            next={finishReview}
            nextLabel="미리보기 준비"
            disabled={unresolved.length > 0}
          />
        </section>
      )}
      {step === "PREVIEW" && record?.finalStore && (
        <section>
          <h2>키오스크 미리보기</h2>
          <p className="preview-note">
            미리보기에서는 실제 주문이나 결제가 발생하지 않습니다.
          </p>
          <dl>
            <dt>메뉴</dt>
            <dd>{record.finalStore.menus.length}개</dd>
            <dt>자동 생성 질문</dt>
            <dd>{catalog?.questions.length ?? 0}개</dd>
          </dl>
          <a
            className="button-link"
            href={`/kiosk?store=${record.id}&preview=1&return=${encodeURIComponent(`/owner/new?id=${record.id}`)}`}
          >
            고객 화면 미리보기
          </a>
          <div className="button-row">
            <button onClick={() => go("SCHEMA")}>추천 기준 수정</button>
            <button onClick={() => go("MENU_IMPORT")}>메뉴 정보 수정</button>
            <button className="primary" onClick={() => go("FINISH")}>
              매장 설정 완료
            </button>
          </div>
        </section>
      )}
      {step === "FINISH" && record?.finalStore && (
        <section>
          <h2>매장 설정 완료</h2>
          <dl>
            <dt>메뉴</dt>
            <dd>{record.finalStore.menus.length}개</dd>
            <dt>추천 기준</dt>
            <dd>{record.finalStore.attributes.length}개</dd>
            <dt>자동 생성 질문</dt>
            <dd>{catalog?.questions.length ?? 0}개</dd>
            <dt>필수 확인</dt>
            <dd>100%</dd>
          </dl>
          <div className="button-row">
            <a className="button-link" href={`/kiosk?store=${record.id}`}>
              키오스크 열기
            </a>
            <a className="button-link secondary" href="/owner">
              매장 관리
            </a>
            <button
              onClick={() =>
                download(
                  `${record.id}-store.json`,
                  exportStoreJson(record.finalStore!),
                  "application/json",
                )
              }
            >
              매장 데이터 백업
            </button>
          </div>
        </section>
      )}
      {message && (
        <output className="wizard-message" aria-live="polite">
          {message}
        </output>
      )}
    </main>
  );
}

function choices(
  d: AttributeDefinition,
): Array<{ label: string; value: AttributeValue }> {
  if (d.reviewChoices?.length) return d.reviewChoices;
  if (d.type === "number")
    return [
      { label: d.lowLabel ?? "낮음", value: 0 },
      { label: "보통", value: 0.5 },
      { label: d.highLabel ?? "높음", value: 1 },
    ];
  return (d.options ?? []).map((x) => ({ label: x.label, value: x.value }));
}
function Upload({
  label,
  accept,
  read,
  onError,
}: {
  label: string;
  accept: string;
  read: (x: string) => void;
  onError: (e: unknown) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="file"
        accept={accept}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f)
            try {
              read(await f.text());
            } catch (err) {
              onError(err);
            }
        }}
      />
    </label>
  );
}
function Actions({
  back,
  backLabel,
  next,
  nextLabel,
  disabled,
}: {
  back: () => void;
  backLabel: string;
  next: () => void | Promise<void>;
  nextLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="step-actions">
      <button onClick={back}>{backLabel}</button>
      <button className="primary" disabled={disabled} onClick={next}>
        {nextLabel}
      </button>
    </div>
  );
}
function IssueEditor({
  issue,
  existing,
  onAdd,
  onReplace,
  onCancel,
}: {
  issue: MenuImportIssue;
  existing: RawStoreMenu[];
  onAdd: (m: RawStoreMenu) => void;
  onReplace: (m: RawStoreMenu) => void;
  onCancel: () => void;
}) {
  const raw =
    issue.raw && typeof issue.raw === "object" && !Array.isArray(issue.raw)
      ? (issue.raw as Record<string, unknown>)
      : {};
  const [name, setName] = useState(
      typeof raw.name === "string" ? raw.name : "",
    ),
    [price, setPrice] = useState(String(raw.price ?? ""));
  const parse = (rename = false) => {
    const result = validateImportedMenus([
      { ...raw, name: rename ? `${name} 2` : name, price },
    ]);
    return result.valid[0];
  };
  const add = (rename = false) => {
    const menu = parse(rename);
    if (
      menu &&
      !existing.some(
        (x) => x.name.trim().toLowerCase() === menu.name.trim().toLowerCase(),
      )
    )
      onAdd({ ...menu, id: `${menu.id}-${Date.now()}` });
  };
  return (
    <div className="issue-row">
      <p>
        <strong>{issue.row}행:</strong> {issue.message}
      </p>
      <label>
        메뉴 이름
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        가격
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </label>
      <div className="button-row">
        <button onClick={() => issue.message.includes("중복") ? parse() && onReplace(parse()!) : add(false)}>
          {issue.message.includes("중복") ? "기존 메뉴 수정" : "수정하여 추가"}
        </button>
        {issue.message.includes("중복") && (
          <button onClick={() => add(true)}>다른 이름으로 추가</button>
        )}
        <button onClick={onCancel}>취소</button>
      </div>
    </div>
  );
}
function MenuEditor({
  menus,
  onChange,
}: {
  menus: RawStoreMenu[];
  onChange: (x: RawStoreMenu[]) => void;
}) {
  const update = (i: number, p: Partial<RawStoreMenu>) =>
    onChange(menus.map((m, n) => (n === i ? { ...m, ...p } : m)));
  return (
    <div className="menu-editor">
      <h3>현재 메뉴 {menus.length}개</h3>
      {menus.map((m, i) => (
        <div key={m.id}>
          <label>
            메뉴 이름
            <input
              value={m.name}
              onChange={(e) => update(i, { name: e.target.value })}
            />
          </label>
          <label>
            가격
            <input
              type="number"
              min="0"
              value={m.price}
              onChange={(e) => update(i, { price: Number(e.target.value) })}
            />
          </label>
          <label>
            설명
            <input
              value={m.description ?? ""}
              onChange={(e) => update(i, { description: e.target.value })}
            />
          </label>
          <label>
            분류
            <input
              value={m.category ?? ""}
              onChange={(e) => update(i, { category: e.target.value })}
            />
          </label>
          <button onClick={() => onChange(menus.filter((_, n) => n !== i))}>
            메뉴 삭제
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          onChange([
            ...menus,
            {
              id: `menu-${Date.now()}`,
              name: "",
              price: 0,
              description: "",
              category: "",
            },
          ])
        }
      >
        메뉴 직접 추가
      </button>
    </div>
  );
}
