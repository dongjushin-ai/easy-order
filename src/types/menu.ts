export type Temperature = "hot" | "cold" | "both";

export type AttributeValue = number | string;
export type AttributeVector = Record<string, AttributeValue>;

export interface MenuAttributes {
  [key: string]: AttributeValue;
  temperature: Temperature;
  coffee: number;
  sweetness: number;
  milk: number;
  caffeine: number;
  refreshing: number;
  creamy: number;
  fruity: number;
}

export interface Menu {
  id: string;
  name: string;
  price: number;
  attributes: MenuAttributes;
}

export interface StoreMenu {
  id: string;
  name: string;
  price: number;
  attributes: AttributeVector;
  optionGroupIds?: string[];
}
