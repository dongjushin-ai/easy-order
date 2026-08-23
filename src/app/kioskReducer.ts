import type { CartItem, PaymentMethod, PaymentOutcome } from "../types/order";

export type Screen = "start" | "search" | "questions" | "results" | "detail" | "cart" | "payment" | "processing" | "payment-failed" | "complete";

export interface KioskState {
  storeId: string;
  screen: Screen;
  history: Array<{ questionId: string; optionId: string }>;
  helpOpen: boolean;
  largeText: boolean;
  selectedMenuId: string | null;
  cart: CartItem[];
  paymentMethod: PaymentMethod | null;
  demoPaymentOutcome: PaymentOutcome;
  paymentFailure: Exclude<PaymentOutcome, "success"> | null;
  orderNumber: number | null;
}

export function createInitialState(storeId: string, largeText = false): KioskState {
  return { storeId, screen: "start", history: [], helpOpen: false, largeText, selectedMenuId: null, cart: [], paymentMethod: null, demoPaymentOutcome: "success", paymentFailure: null, orderNumber: null };
}

export type KioskAction =
  | { type: "SET_STORE"; storeId: string }
  | { type: "GO"; screen: Screen }
  | { type: "ANSWER"; questionId: string; optionId: string; finished: boolean }
  | { type: "SELECT_MENU"; menuId: string }
  | { type: "ADD_TO_CART"; item: CartItem }
  | { type: "SET_QUANTITY"; itemId: string; quantity: number }
  | { type: "REMOVE_CART_ITEM"; itemId: string }
  | { type: "SET_DEMO_PAYMENT_OUTCOME"; outcome: PaymentOutcome }
  | { type: "START_PAYMENT"; method: PaymentMethod }
  | { type: "PAYMENT_RESULT"; outcome: PaymentOutcome; orderNumber?: number }
  | { type: "RETRY_PAYMENT" }
  | { type: "CHANGE_PAYMENT_METHOD" }
  | { type: "BACK" }
  | { type: "RESET" }
  | { type: "HELP"; open: boolean }
  | { type: "TOGGLE_LARGE_TEXT" };

export function kioskReducer(state: KioskState, action: KioskAction): KioskState {
  switch (action.type) {
    case "SET_STORE": return createInitialState(action.storeId, state.largeText);
    case "GO": {
      if (action.screen === "payment" && state.cart.length === 0) return state;
      return { ...state, screen: action.screen };
    }
    case "ANSWER": return state.screen !== "questions" ? state : { ...state, history: [...state.history, { questionId: action.questionId, optionId: action.optionId }], screen: action.finished ? "results" : "questions" };
    case "SELECT_MENU": return { ...state, selectedMenuId: action.menuId, screen: "detail" };
    case "ADD_TO_CART": return state.screen !== "detail" ? state : { ...state, cart: [...state.cart, action.item], screen: "cart" };
    case "SET_QUANTITY": return { ...state, cart: state.cart.map((item) => item.id === action.itemId ? { ...item, quantity: Math.max(1, action.quantity) } : item) };
    case "REMOVE_CART_ITEM": return { ...state, cart: state.cart.filter((item) => item.id !== action.itemId) };
    case "SET_DEMO_PAYMENT_OUTCOME": return state.screen === "payment" ? { ...state, demoPaymentOutcome: action.outcome } : state;
    case "START_PAYMENT": return state.screen !== "payment" || state.cart.length === 0 ? state : { ...state, paymentMethod: action.method, paymentFailure: null, screen: "processing" };
    case "PAYMENT_RESULT": {
      if (state.screen !== "processing") return state;
      return action.outcome === "success"
        ? { ...state, orderNumber: action.orderNumber ?? 100, paymentFailure: null, screen: "complete" }
        : { ...state, paymentFailure: action.outcome, screen: "payment-failed" };
    }
    case "RETRY_PAYMENT": return state.screen === "payment-failed" && state.paymentMethod ? { ...state, paymentFailure: null, demoPaymentOutcome: "success", screen: "processing" } : state;
    case "CHANGE_PAYMENT_METHOD": return state.screen === "payment-failed" ? { ...state, paymentFailure: null, paymentMethod: null, screen: "payment" } : state;
    case "BACK": {
      if (state.screen === "detail") return { ...state, screen: "search", selectedMenuId: null };
      if (state.screen === "cart") return { ...state, screen: state.selectedMenuId ? "detail" : "search" };
      if (state.screen === "payment" || state.screen === "payment-failed") return { ...state, screen: "cart", paymentFailure: null };
      if (state.history.length) return { ...state, screen: "questions", history: state.history.slice(0, -1) };
      return { ...state, screen: "start", history: [] };
    }
    case "RESET": return createInitialState(state.storeId, state.largeText);
    case "HELP": return { ...state, helpOpen: action.open };
    case "TOGGLE_LARGE_TEXT": return { ...state, largeText: !state.largeText };
  }
}
