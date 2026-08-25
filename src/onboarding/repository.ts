import { loadStoreData } from "../data/storeLoader";
import type { RawStoreData } from "../types/store";
import type { OnboardingStoreRecord, OnboardingStep, StoreInfo } from "./types";
export const STORE_REPOSITORY_KEY = "easy-order-stores-v1";
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export interface RepositoryIssue { type:"CORRUPTED"|"VERSION_MISMATCH"; message:string; raw?:string }
export class LocalStoreRepository {
  constructor(private storage: StorageLike) {}
  read():{records:OnboardingStoreRecord[];issues:RepositoryIssue[]} {
    const raw=this.storage.getItem(STORE_REPOSITORY_KEY);
    if(!raw)return {records:[],issues:[]};
    try {
      const x = JSON.parse(raw);
      if(!Array.isArray(x))return {records:[],issues:[{type:"CORRUPTED",message:"저장된 매장 데이터 형식을 읽을 수 없습니다.",raw}]};
      const mismatch=x.some(r=>r&&typeof r==="object"&&r.createdBy==="USER"&&r.storeFormatVersion!==1);
      return {records:x.filter(
            (r) => r && r.storeFormatVersion === 1 && r.createdBy === "USER",
          ),issues:mismatch?[{type:"VERSION_MISMATCH",message:"일부 매장 데이터는 현재 버전에서 열 수 없습니다.",raw}]:[]};
    } catch {
      return {records:[],issues:[{type:"CORRUPTED",message:"저장된 매장 데이터를 읽는 중 문제가 발생했습니다.",raw}]};
    }
  }
  list(): OnboardingStoreRecord[] {return this.read().records}
  issues():RepositoryIssue[]{return this.read().issues}
  clearInvalidData(){this.storage.removeItem(STORE_REPOSITORY_KEY)}
  save(record: OnboardingStoreRecord) {
    const next = [
      ...this.list().filter((x) => x.id !== record.id),
      { ...record, updatedAt: new Date().toISOString() },
    ];
    this.storage.setItem(STORE_REPOSITORY_KEY, JSON.stringify(next));
  }
  get(id: string) {
    return this.list().find((x) => x.id === id);
  }
  delete(id: string) {
    this.storage.setItem(
      STORE_REPOSITORY_KEY,
      JSON.stringify(this.list().filter((x) => x.id !== id)),
    );
  }
  deleteDemoStores(){this.storage.setItem(STORE_REPOSITORY_KEY,JSON.stringify(this.list().filter(record=>!record.demoCreated)))}
  duplicate(id: string) {
    const source = this.get(id);
    if (!source) throw new Error("Store not found");
    const now = new Date().toISOString(),copyId=`${source.id}-copy-${Date.now()}`,
      copy = {
        ...structuredClone(source),
        id: copyId,
        info: { ...source.info, name: `${source.info.name} 복사본` },
        rawStore: {
          ...source.rawStore,
          storeId: copyId,
          storeName: `${source.rawStore.storeName} 복사본`,
        },
        enrichedStore:source.enrichedStore?{...structuredClone(source.enrichedStore),storeId:copyId,storeName:`${source.enrichedStore.storeName} 복사본`}:undefined,
        finalStore:source.finalStore?{...structuredClone(source.finalStore),storeId:copyId,storeName:`${source.finalStore.storeName} 복사본`}:undefined,
        createdAt: now,
        updatedAt: now,
      };
    this.save(copy);
    return copy;
  }
  create(info: StoreInfo, options?:{demoCreated?:boolean}) {
    const now = new Date().toISOString(), base = `user-${Date.now()}`;
    let id = base, suffix = 2;
    const existing = new Set(this.list().map((item) => item.id));
    while (existing.has(id)) id = `${base}-${suffix++}`;
    const record: OnboardingStoreRecord = {
      storeFormatVersion: 1,
      id,
      createdBy: "USER",
      demoCreated: options?.demoCreated,
      info,
      step: "STORE_INFO",
      rawStore: {
        storeId: id,
        storeName: info.name,
        attributes: [],
        menus: [],
      },
      createdAt: now,
      updatedAt: now,
    };
    this.save(record);
    return record;
  }
  updateStep(id: string, step: OnboardingStep) {
    const r = this.get(id);
    if (!r) throw new Error("Store not found");
    this.save({ ...r, step });
  }
}
export function loadUserKioskStores(storage: StorageLike) {
  return new LocalStoreRepository(storage).list().flatMap((r) => {
    if (!r.finalStore) return [];
    try {
      return [loadStoreData(r.finalStore)];
    } catch {
      return [];
    }
  });
}
export function exportStoreJson(store: RawStoreData) {
  return JSON.stringify(store, null, 2);
}
