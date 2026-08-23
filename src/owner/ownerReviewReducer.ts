export type OwnerTab = "review" | "all" | "preview";
export interface OwnerReviewUiState { tab: OwnerTab; selectedMenuId: string | null; showJson: boolean; }
export type OwnerReviewAction = { type: "TAB"; tab: OwnerTab } | { type: "SELECT_MENU"; menuId: string } | { type: "TOGGLE_JSON" };
export function ownerReviewReducer(state: OwnerReviewUiState, action: OwnerReviewAction): OwnerReviewUiState {
  switch (action.type) {
    case "TAB": return { ...state, tab: action.tab, showJson: false };
    case "SELECT_MENU": return { ...state, selectedMenuId: action.menuId };
    case "TOGGLE_JSON": return { ...state, showJson: !state.showJson };
  }
}
