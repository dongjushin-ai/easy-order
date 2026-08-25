import type { EnrichedStoreData } from "../types/enrichment";import type { RawStoreData,RawStoreMenu } from "../types/store";
export const ONBOARDING_STEPS=["STORE_INFO","MENU_IMPORT","SCHEMA","ENRICHMENT","REVIEW","PREVIEW","FINISH"] as const;export type OnboardingStep=(typeof ONBOARDING_STEPS)[number];
export const ONBOARDING_STEP_LABELS:Record<OnboardingStep,string>={STORE_INFO:"매장 정보",MENU_IMPORT:"메뉴",SCHEMA:"추천 기준",ENRICHMENT:"자동 분석",REVIEW:"확인",PREVIEW:"미리보기",FINISH:"완료"};
export interface StoreInfo{name:string;category?:string;description?:string}
export interface OnboardingStoreRecord{storeFormatVersion:1;id:string;createdBy:"USER";demoCreated?:boolean;info:StoreInfo;step:OnboardingStep;rawStore:RawStoreData;enrichedStore?:EnrichedStoreData;finalStore?:RawStoreData;createdAt:string;updatedAt:string}
export interface MenuImportIssue{row:number;message:string;raw:unknown}
export interface MenuImportPreview{valid:RawStoreMenu[];issues:MenuImportIssue[];total:number}
