import type { RawStoreData, RawStoreMenu } from "../types/store";
import type { MenuImportPreview } from "./types";
export function slugify(value: string) {
  const base = value
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "menu";
}
export function assignUniqueMenuIds(
  rows: Array<Omit<RawStoreMenu, "id">>,
): RawStoreMenu[] {
  const used = new Map<string, number>();
  return rows.map((r) => {
    const base = slugify(r.name),
      count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    return { ...r, id: count === 1 ? base : `${base}-${count}` };
  });
}
function csvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' && text[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (c === '"') quoted = !quoted;
    else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}
export function validateImportedMenus(rows: unknown[]): MenuImportPreview {
  const validBase: Array<Omit<RawStoreMenu, "id">> = [],
    issues = [] as MenuImportPreview["issues"],
    names = new Set<string>();
  rows.forEach((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      issues.push({ row: index + 1, message: "행이 객체가 아닙니다.", raw });
      return;
    }
    const safe = raw as Record<string, unknown>,
      name = typeof safe.name === "string" ? safe.name.trim() : "",
      price = typeof safe.price === "number" ? safe.price : Number(safe.price),
      normalized = name.toLocaleLowerCase();
    if (!name) {
      issues.push({ row: index + 1, message: "메뉴명이 없습니다.", raw });
      return;
    }
    if ((typeof safe.price === "string" && !safe.price.trim()) || !Number.isFinite(price) || price < 0) {
      issues.push({
        row: index + 1,
        message: "가격이 올바르지 않습니다.",
        raw,
      });
      return;
    }
    if (names.has(normalized)) {
      issues.push({ row: index + 1, message: "중복 메뉴명입니다.", raw });
      return;
    }
    names.add(normalized);
    validBase.push({
      name,
      price,
      description: typeof safe.description === "string" ? safe.description : "",
      category: typeof safe.category === "string" ? safe.category : "",
    });
  });
  return { valid: assignUniqueMenuIds(validBase), issues, total: rows.length };
}
export function importMenuCsv(text: string): MenuImportPreview {
  const rows = csvRows(text);
  if (!rows.length) return { valid: [], issues: [], total: 0 };
  const headers = rows.shift()!.map((x) => x.trim().toLowerCase());
  const values = rows
    .filter((r) => r.some((x) => x.trim()))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
  return validateImportedMenus(values);
}
export function importMenuJson(text: string): MenuImportPreview {
  const parsed: unknown = JSON.parse(text);
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { menus?: unknown }).menus)
      ? (parsed as { menus: unknown[] }).menus
      : [];
  return validateImportedMenus(rows);
}
export function importStoreJson(text: string): RawStoreData {
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Store JSON 객체가 필요합니다.");
  const x = parsed as Record<string, unknown>;
  if (
    typeof x.storeId !== "string" ||
    typeof x.storeName !== "string" ||
    !Array.isArray(x.attributes) ||
    !Array.isArray(x.menus)
  )
    throw new Error("지원하지 않는 Store JSON입니다.");
  if (
    ["__proto__", "prototype", "constructor"].some((k) =>
      Object.prototype.hasOwnProperty.call(x, k),
    )
  )
    throw new Error("허용되지 않는 JSON key입니다.");
  return {
    storeId: x.storeId,
    storeName: x.storeName,
    attributes: x.attributes as RawStoreData["attributes"],
    menus: x.menus as RawStoreData["menus"],
    orderOptionGroups: Array.isArray(x.orderOptionGroups)
      ? (x.orderOptionGroups as RawStoreData["orderOptionGroups"])
      : [],
    defaultOptionGroupIds: Array.isArray(x.defaultOptionGroupIds)
      ? (x.defaultOptionGroupIds as string[])
      : [],
  };
}
export const CSV_TEMPLATE =
  'name,price,description,category\r\n아메리카노,3000,"에스프레소에 물을 더한 커피",커피\r\n';
