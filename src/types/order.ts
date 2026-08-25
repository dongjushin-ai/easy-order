export interface OrderOptionChoice { id: string; label: string; priceDelta: number; }
export interface OptionVisibilityCondition { groupId: string; choiceId: string; }
export interface OrderOptionGroup { id: string; label: string; required: boolean; choices: OrderOptionChoice[]; visibleWhen?: OptionVisibilityCondition; }
export interface SelectedOrderOption { groupId: string; choiceId: string; label: string; priceDelta: number; }
export interface CartItem { id: string; menuId: string; name: string; basePrice: number; quantity: number; options: SelectedOrderOption[]; unitPrice: number; }
export type PaymentMethod = "card" | "easy-pay";
export type PaymentOutcome = "success" | "card-read-failed" | "approval-failed" | "cancelled";
