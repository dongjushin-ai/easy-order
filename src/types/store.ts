import type { AttributeValue, StoreMenu } from "./menu";
import type { Question } from "./question";
import type { OrderOptionGroup } from "./order";

export interface AttributeOptionDefinition {
  value: AttributeValue;
  label: string;
  aliases?: string[];
}

export interface AttributeDefinition {
  key: string;
  label: string;
  type: "number" | "category";
  question?: string;
  lowLabel?: string;
  highLabel?: string;
  options?: AttributeOptionDefinition[];
  reviewChoices?: Array<{ label: string; value: AttributeValue }>;
}

export interface RawStoreMenu {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  options?: string[];
  attributes?: Record<string, unknown>;
  optionGroupIds?: string[];
}

export interface RawStoreData {
  storeId: string;
  storeName: string;
  attributes: AttributeDefinition[];
  menus: RawStoreMenu[];
  orderOptionGroups?: OrderOptionGroup[];
  defaultOptionGroupIds?: string[];
}

export interface StoreCatalog {
  storeId: string;
  storeName: string;
  attributeDefinitions: AttributeDefinition[];
  menus: StoreMenu[];
  questions: Question[];
  orderOptionGroups: OrderOptionGroup[];
}
