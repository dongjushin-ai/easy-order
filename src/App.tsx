import { useMemo, useReducer } from "react";
import { stores } from "./data/stores";
import { loadUserKioskStores } from "./onboarding/repository";
import { replayAnswers } from "./app/kioskFlow";
import {
  createInitialState,
  kioskReducer,
  type Screen,
} from "./app/kioskReducer";
import { HelpButton } from "./ui/HelpButton";
import { StartScreen } from "./ui/StartScreen";
import { SearchScreen } from "./ui/SearchScreen";
import { QuestionScreen } from "./ui/QuestionScreen";
import { RecommendationScreen } from "./ui/RecommendationScreen";
import { MenuDetailScreen } from "./ui/MenuDetailScreen";
import { CartScreen } from "./ui/CartScreen";
import { PaymentScreen } from "./ui/PaymentScreen";
import { PaymentProcessingScreen } from "./ui/PaymentProcessingScreen";
import { PaymentFailureScreen } from "./ui/PaymentFailureScreen";
import { OrderCompleteScreen } from "./ui/OrderCompleteScreen";
import { OrderProgress } from "./ui/OrderProgress";

function getOrderStep(screen: Screen): 1 | 2 | 3 | 4 | null {
  if (screen === "search") return 1;
  if (screen === "results" || screen === "detail") return 2;
  if (screen === "cart") return 3;
  if (["payment", "processing", "payment-failed", "complete"].includes(screen))
    return 4;
  return null;
}

export default function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const previewMode = searchParams.get("preview") === "1";
  const previewReturn = searchParams.get("return") ?? "/owner";
  const availableStores = useMemo(() => [...stores, ...loadUserKioskStores(window.localStorage)], []);
  const requestedStore = new URLSearchParams(window.location.search).get("store");
  const [state, dispatch] = useReducer(
    kioskReducer,
    createInitialState(availableStores.some((store) => store.storeId === requestedStore) ? requestedStore! : availableStores[0].storeId),
  );
  const store =
    availableStores.find((item) => item.storeId === state.storeId) ?? availableStores[0];
  const snapshot = useMemo(
    () => replayAnswers(store, state.history),
    [store, state.history],
  );
  const selectedMenu = store.menus.find(
    (menu) => menu.id === state.selectedMenuId,
  );
  const cartTotal = state.cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const orderStep = getOrderStep(state.screen);

  function answer(optionId: string) {
    if (!snapshot.nextQuestion) return;
    const nextHistory = [
      ...state.history,
      { questionId: snapshot.nextQuestion.question.id, optionId },
    ];
    const finished = replayAnswers(store, nextHistory).nextQuestion === null;
    dispatch({
      type: "ANSWER",
      questionId: snapshot.nextQuestion.question.id,
      optionId,
      finished,
    });
  }

  return (
    <div className={state.largeText ? "app-shell large-text" : "app-shell"}>
      {import.meta.env.VITE_DEMO_MODE === "true" && <span className="global-demo-badge" aria-label="데모 환경">DEMO</span>}
      {previewMode && <aside className="preview-banner" role="status"><strong>미리보기 · 실제 주문이나 결제가 발생하지 않습니다.</strong><a href={previewReturn}>설정으로 돌아가기</a></aside>}
      <header className="topbar">
        <div>
          <span className="brand-dot" /> <strong>{store.storeName}</strong>
        </div>
        <div className="header-tools">
          <button
            className="text-size-toggle"
            aria-pressed={state.largeText}
            onClick={() => dispatch({ type: "TOGGLE_LARGE_TEXT" })}
          >
            {state.largeText ? "기본 글자 보기" : "글자 크게 보기"}
          </button>
          <label className="store-switcher">
            Demo Store:
            <select
              value={store.storeId}
              onChange={(event) =>
                dispatch({ type: "SET_STORE", storeId: event.target.value })
              }
            >
              {availableStores.map((item) => (
                <option key={item.storeId} value={item.storeId}>
                  {item.storeName}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>
      {orderStep && <OrderProgress current={orderStep} />}

      {state.screen === "start" && (
        <StartScreen
          onSearch={() => dispatch({ type: "GO", screen: "search" })}
          onRecommend={() =>
            dispatch({
              type: "GO",
              screen: snapshot.nextQuestion ? "questions" : "results",
            })
          }
        />
      )}
      {state.screen === "search" && (
        <SearchScreen
          key={store.storeId}
          menus={store.menus}
          onSelect={(menuId) => dispatch({ type: "SELECT_MENU", menuId })}
          onBack={() => dispatch({ type: "GO", screen: "start" })}
          onHome={() => dispatch({ type: "RESET" })}
        />
      )}
      {state.screen === "questions" && snapshot.nextQuestion && (
        <QuestionScreen
          question={snapshot.nextQuestion.question}
          current={state.history.length + 1}
          total={store.questions.length}
          onAnswer={answer}
          onBack={() => dispatch({ type: "BACK" })}
          onHome={() => dispatch({ type: "RESET" })}
        />
      )}
      {state.screen === "results" && (
        <RecommendationScreen
          store={store}
          history={state.history}
          onSelect={(menuId) => dispatch({ type: "SELECT_MENU", menuId })}
          onAllMenus={() => dispatch({ type: "GO", screen: "search" })}
          onBack={() => dispatch({ type: "BACK" })}
          onReset={() => dispatch({ type: "RESET" })}
        />
      )}
      {state.screen === "detail" && selectedMenu && (
        <MenuDetailScreen
          key={`${store.storeId}-${selectedMenu.id}`}
          store={store}
          menu={selectedMenu}
          onAdd={(item) => dispatch({ type: "ADD_TO_CART", item })}
          onBack={() => dispatch({ type: "BACK" })}
          onHome={() => dispatch({ type: "RESET" })}
        />
      )}
      {state.screen === "cart" && (
        <CartScreen
          items={state.cart}
          onQuantity={(itemId, quantity) =>
            dispatch({ type: "SET_QUANTITY", itemId, quantity })
          }
          onRemove={(itemId) => dispatch({ type: "REMOVE_CART_ITEM", itemId })}
          onAddMenu={() => dispatch({ type: "GO", screen: "search" })}
          onPay={() => dispatch({ type: "GO", screen: "payment" })}
          onBack={() => dispatch({ type: "BACK" })}
        />
      )}
      {state.screen === "payment" && (
        <PaymentScreen
          total={cartTotal}
          demoOutcome={state.demoPaymentOutcome}
          onDemoOutcome={(outcome) =>
            dispatch({ type: "SET_DEMO_PAYMENT_OUTCOME", outcome })
          }
          onSelect={(method) => dispatch({ type: "START_PAYMENT", method })}
          onBack={() => dispatch({ type: "BACK" })}
        />
      )}
      {state.screen === "processing" && state.paymentMethod && (
        <PaymentProcessingScreen
          method={state.paymentMethod}
          outcome={state.demoPaymentOutcome}
          onResult={(outcome) =>
            dispatch({
              type: "PAYMENT_RESULT",
              outcome,
              orderNumber: Math.floor(100 + Math.random() * 900),
            })
          }
        />
      )}
      {state.screen === "payment-failed" && state.paymentFailure && (
        <PaymentFailureScreen
          failure={state.paymentFailure}
          onRetry={() => dispatch({ type: "RETRY_PAYMENT" })}
          onChangeMethod={() => dispatch({ type: "CHANGE_PAYMENT_METHOD" })}
          onHelp={() => dispatch({ type: "HELP", open: true })}
        />
      )}
      {state.screen === "complete" && state.orderNumber && (
        <OrderCompleteScreen
          orderNumber={state.orderNumber}
          onReset={() => dispatch({ type: "RESET" })}
        />
      )}

      {state.screen !== "processing" && state.screen !== "complete" && (
        <HelpButton onClick={() => dispatch({ type: "HELP", open: true })} />
      )}
      {state.helpOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-title"
          aria-describedby="help-description"
        >
          <div className="help-modal">
            <span aria-hidden="true">도움 요청이 접수되었어요</span>
            <h2 id="help-title">직원을 불러드릴게요.</h2>
            <p id="help-description">
              현재 주문 내용은 그대로 유지됩니다.
              <br />
              잠시만 기다려 주세요.
            </p>
            <button
              autoFocus
              onClick={() => dispatch({ type: "HELP", open: false })}
            >
              도움 창 닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
