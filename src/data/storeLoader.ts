import { generateQuestions } from "../engine/questionGenerator";
import type { AttributeValue, StoreMenu } from "../types/menu";
import type { AttributeDefinition, RawStoreData, StoreCatalog } from "../types/store";

function normalizeValue(value: unknown, definition: AttributeDefinition, menuId: string): AttributeValue {
  if (definition.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`${menuId}.${definition.key} must be a finite number`);
    }
    return Math.min(1, Math.max(0, value));
  }

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${menuId}.${definition.key} must be a non-empty string`);
  }
  const normalized = value.trim();
  if (definition.options && !definition.options.some((option) => option.value === normalized)) {
    throw new Error(`${menuId}.${definition.key} has an unsupported category: ${normalized}`);
  }
  return normalized;
}

export function loadStoreData(raw: RawStoreData): StoreCatalog {
  const definitionKeys = new Set<string>();
  for (const definition of raw.attributes) {
    if (definitionKeys.has(definition.key)) throw new Error(`Duplicate attribute: ${definition.key}`);
    definitionKeys.add(definition.key);
  }

  const menuIds = new Set<string>();
  const menus: StoreMenu[] = raw.menus.map((menu) => {
    if (menuIds.has(menu.id)) throw new Error(`Duplicate menu id: ${menu.id}`);
    menuIds.add(menu.id);
    if (!menu.name.trim() || !Number.isFinite(menu.price) || menu.price < 0) {
      throw new Error(`Invalid menu metadata: ${menu.id}`);
    }

    const attributes: Record<string, AttributeValue> = {};
    for (const definition of raw.attributes) {
      attributes[definition.key] = normalizeValue(menu.attributes?.[definition.key], definition, menu.id);
    }
    const optionGroupIds = menu.optionGroupIds ?? raw.defaultOptionGroupIds ?? [];
    for (const groupId of optionGroupIds) {
      if (!raw.orderOptionGroups?.some((group) => group.id === groupId)) {
        throw new Error(`${menu.id} references unknown order option group: ${groupId}`);
      }
    }
    return { id: menu.id, name: menu.name.trim(), price: menu.price, attributes, optionGroupIds };
  });

  return {
    storeId: raw.storeId,
    storeName: raw.storeName,
    attributeDefinitions: raw.attributes,
    menus,
    questions: generateQuestions(menus, raw.attributes),
    orderOptionGroups: raw.orderOptionGroups ?? [],
  };
}
