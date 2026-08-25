import { KOREAN_SNACK_DATASET_VERSION } from "../evaluation/koreanSnackDataset";
import { RATER_IDS, type FinalDecision, type RaterAssessment, type RaterId } from "./types";
import { reviewKey, validateAssessment } from "./core";
export const storageKey=(r:RaterId)=>`easy-order-adjudication-${KOREAN_SNACK_DATASET_VERSION}-rater-${r}`;
const finalKey=`easy-order-adjudication-${KOREAN_SNACK_DATASET_VERSION}-final-decisions`;
export function loadAssessments(r:RaterId,storage:Pick<Storage,"getItem">=localStorage):RaterAssessment[]{try{const x=JSON.parse(storage.getItem(storageKey(r))??"[]");return Array.isArray(x)?x.filter(validateAssessment):[];}catch{return [];}}
export function saveAssessments(r:RaterId,items:RaterAssessment[],storage:Pick<Storage,"setItem">=localStorage){if(!items.every(a=>a.raterId===r&&validateAssessment(a)))throw new Error("Invalid assessment data");storage.setItem(storageKey(r),JSON.stringify(items));}
export function upsertAssessment(items:RaterAssessment[],next:RaterAssessment){if(!validateAssessment(next))throw new Error("Invalid assessment");return [...items.filter(a=>reviewKey(a.menuId,a.attributeId)!==reviewKey(next.menuId,next.attributeId)),next];}
export function resetRater(r:RaterId,storage:Pick<Storage,"removeItem">=localStorage){storage.removeItem(storageKey(r));}
export function loadAll(storage:Pick<Storage,"getItem">=localStorage){return Object.fromEntries(RATER_IDS.map(r=>[r,loadAssessments(r,storage)])) as Record<RaterId,RaterAssessment[]>;}
export function loadDecisions(storage:Pick<Storage,"getItem">=localStorage):FinalDecision[]{try{const x=JSON.parse(storage.getItem(finalKey)??"[]");return Array.isArray(x)?x:[];}catch{return [];}}
export function saveDecisions(x:FinalDecision[],storage:Pick<Storage,"setItem">=localStorage){storage.setItem(finalKey,JSON.stringify(x));}
