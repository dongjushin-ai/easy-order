import { KOREAN_SNACK_DATASET_VERSION, koreanSnackGroundTruth } from "../evaluation/koreanSnackDataset";
import { calculateAgreement, CONFIDENCE_WEIGHT, proposeRange, REVIEW_QUEUE, validateAssessment } from "./core";
import { exportCsv, importCsv } from "./csv";
import { diffMarkdown, generateSnackV2, humanAgreementByAttribute, offlineRangeAccuracy } from "./generator";
import { loadAssessments, saveAssessments, storageKey, upsertAssessment } from "./storage";
import type { FinalDecision, RaterAssessment, RaterId } from "./types";
function assert(x:unknown,m:string):asserts x {if(!x)throw new Error(`Adjudication: ${m}`)}
const assessment=(raterId:RaterId,valueMin:number,valueMax=valueMin):RaterAssessment=>({datasetVersion:KOREAN_SNACK_DATASET_VERSION,menuId:REVIEW_QUEUE[0].menuId,attributeId:REVIEW_QUEUE[0].attributeId,raterId,valueMin,valueMax,confidenceLevel:"HIGH",confidence:CONFIDENCE_WEIGHT.HIGH,updatedAt:"2026-08-23T00:00:00.000Z"});
export function runAdjudicationTests(){
 console.log("\n[Human adjudication]");
 assert(REVIEW_QUEUE.length===66,"review queue must be 60 Tier C values plus 6 unique non-Tier-C audit conflicts");
 assert(validateAssessment(assessment("A",.5)),"valid anchor assessment");assert(!validateAssessment({...assessment("A",.5),valueMin:.4}),"reject non-anchor");assert(!validateAssessment({...assessment("A",.5),valueMax:1}),"reject non-adjacent range");
 const unanimous=[assessment("A",.75),assessment("B",.75),assessment("C",.75)];const high=calculateAgreement(unanimous);assert(high?.level==="HIGH"&&high.median===.75,"median/high agreement");assert(proposeRange(high).min===.65&&proposeRange(high).max===.85,"unanimous tolerance proposal");
 const low=calculateAgreement([assessment("A",0),assessment("B",.5),assessment("C",1)]);assert(low?.level==="LOW"&&low.spread===1,"low agreement");
 const memory=new Map<string,string>();const store={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>void memory.set(k,v),removeItem:(k:string)=>void memory.delete(k)};saveAssessments("A",[assessment("A",.5)],store);assert(loadAssessments("A",store).length===1&&memory.has(storageKey("A")),"local persistence");memory.set(storageKey("A"),"bad json");assert(loadAssessments("A",store).length===0,"invalid storage recovery");
 const csv=exportCsv([assessment("A",.5,.75)]);assert(importCsv(csv,"A")[0].valueMax===.75,"CSV round trip");let rejected=false;try{importCsv(csv,"B")}catch{rejected=true}assert(rejected,"CSV rater isolation");assert(upsertAssessment([assessment("A",0)],assessment("A",.25)).length===1,"upsert");
 const decision:FinalDecision={menuId:REVIEW_QUEUE[0].menuId,attributeId:REVIEW_QUEUE[0].attributeId,mode:"APPLY_PROPOSED",range:{min:.4,max:.6},reason:"HUMAN_CONSENSUS",decidedAt:"2026-08-23T00:00:00.000Z"};const before=JSON.stringify(koreanSnackGroundTruth);const v2=generateSnackV2([decision]);assert(v2.metadata.parentVersion==="snack20-v1"&&v2.metadata.version==="snack20-v2"&&v2.metadata.changedAttributeCount===1,"v2 metadata");assert(JSON.stringify(koreanSnackGroundTruth)===before,"v1 preserved");assert(diffMarkdown(v2,[decision],unanimous).includes("HUMAN_CONSENSUS"),"diff report");
 const offline=offlineRangeAccuracy([{menuId:decision.menuId,attributeId:decision.attributeId,value:.5,model:"stored-luna"}],v2.groundTruth);assert(offline["stored-luna"].rangeAccuracy===1,"offline evaluation uses supplied stored prediction");const human=humanAgreementByAttribute(unanimous);assert(human[unanimous[0].attributeId].highAgreementRate===1,"human agreement metric");
 console.log(`- queue ${REVIEW_QUEUE.length}, validation/storage/CSV/agreement/v2/diff/offline: passed`);
}
