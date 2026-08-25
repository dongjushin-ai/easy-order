import {stores} from "../data/stores";
import {loadStoreData} from "../data/storeLoader";
import {confirmOwnerEstimate,enrichStoreData,toFinalStoreData} from "../enrichment/enrichment";
import {MockAttributeProvider} from "../enrichment/MockAttributeProvider";
import {getReviewRequiredAttributes} from "../enrichment/review";
import {CSV_TEMPLATE,importMenuCsv,importMenuJson,importStoreJson,slugify,validateImportedMenus} from "./menuImport";
import {exportStoreJson,loadUserKioskStores,LocalStoreRepository,STORE_REPOSITORY_KEY} from "./repository";
import {createCustomNumericAttribute,schemaPresets,suggestSchemaPreset} from "./schemaPresets";
import {SAMPLE_MENU_CSV} from "../demo/sampleMenus";

function check(value:unknown,message:string):asserts value{if(!value)throw new Error(`Onboarding: ${message}`)}
function memoryStorage(){const memory=new Map<string,string>();return {memory,storage:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>void memory.set(k,v),removeItem:(k:string)=>void memory.delete(k)}}}

export async function runOnboardingTests(){
 console.log("\n[Local store onboarding]");
 const crlf='name,price,description,category\r\n아메리카노,3000,"물, 에스프레소",커피\r\n라떼,,우유,커피\r\n아메리카노,3500,중복,커피\r\n',imported=importMenuCsv(crlf);
 check(imported.valid.length===1&&imported.issues.length===2&&imported.valid[0].description==="물, 에스프레소","CSV partial validation/quotes/Korean/CRLF");
 check(importMenuCsv(CSV_TEMPLATE.replaceAll("\r\n","\n")).valid.length===1,"LF CSV");
 const twenty=Array.from({length:20},(_,i)=>({name:`메뉴 ${i+1}`,price:i<3?"":3000+i})),partial=validateImportedMenus(twenty);
 check(partial.valid.length===17&&partial.issues.length===3,"scenario B imports 17 valid rows while retaining 3 repairable issues");
 const repaired=validateImportedMenus(partial.issues.map((x,i)=>({...x.raw as object,price:4000+i})));
 check(repaired.valid.length===3&&[...partial.valid,...repaired.valid].length===20,"scenario B repairs all rows");
 check(importMenuJson(JSON.stringify([{name:"버거",price:5000},{name:"가격 없음"}])).valid.length===1,"JSON partial import");
 check(slugify("매운 치킨 버거")==="매운-치킨-버거"&&validateImportedMenus([{name:"A",price:"bad"}]).issues.length===1,"input validation");
 check(schemaPresets.length===3&&suggestSchemaPreset("Fast Food").id==="fast-food","schema preset");
 check(createCustomNumericAttribute({name:"양 많음",meaning:"한 메뉴의 양",low:"적음",medium:"보통",high:"많음",question:"양은 어느 정도가 좋으세요?"}).reviewChoices?.length===3,"custom operational anchors");
 for(const [kind,csv] of Object.entries(SAMPLE_MENU_CSV)){const sample=importMenuCsv(csv);check(sample.valid.length===3&&sample.issues.length===0,`demo ${kind} sample import`)}

 const {memory,storage}=memoryStorage(),repo=new LocalStoreRepository(storage);
 let record=repo.create({name:"My Cafe",category:"Cafe"});record={...record,step:"SCHEMA",rawStore:{...record.rawStore,attributes:suggestSchemaPreset("Cafe").attributes.slice(0,3),menus:imported.valid}};repo.save(record);
 check(new LocalStoreRepository(storage).get(record.id)?.step==="SCHEMA","scenario A/E reload resumes exact step");
 const second=repo.create({name:"My Burger",category:"Fast Food"}),copy=repo.duplicate(second.id);
 check(copy.id===copy.rawStore.storeId&&copy.info.name.includes("복사본"),"scenario F clone has collision-free consistent id");
 copy.rawStore.menus.push({id:"independent",name:"독립",price:1});
 check(repo.get(second.id)?.rawStore.menus.length===0,"scenario F clone does not mutate source");
 repo.delete(copy.id);check(!repo.get(copy.id)&&repo.get(second.id),"scenario G confirmed delete target only");
 const demoStore=repo.create({name:"Demo Store"},{demoCreated:true});repo.deleteDemoStores();check(!repo.get(demoStore.id)&&repo.get(second.id),"demo reset removes only demo-created data");

 let enriched=await enrichStoreData(record.rawStore,new MockAttributeProvider());
 for(const item of getReviewRequiredAttributes(enriched))enriched=confirmOwnerEstimate(enriched,item.menuId,item.attribute);
 const final=toFinalStoreData(enriched);loadStoreData(final);record={...record,enrichedStore:enriched,finalStore:final,step:"FINISH"};repo.save(record);
 check(loadUserKioskStores(storage).some(s=>s.storeId===record.id),"scenario C fallback review/finalize and kiosk load");
 const changed={...record,step:"SCHEMA" as const,rawStore:{...record.rawStore,attributes:record.rawStore.attributes.slice(0,2)},enrichedStore:undefined,finalStore:undefined};repo.save(changed);
 check(repo.get(record.id)?.step==="SCHEMA"&&!repo.get(record.id)?.finalStore,"scenario D schema edit invalidates stale preview");
 const restored=importStoreJson(exportStoreJson(final));check(restored.storeId===final.storeId,"JSON backup/restore");

 const corrupt=memoryStorage();corrupt.memory.set(STORE_REPOSITORY_KEY,"{broken");const corruptRepo=new LocalStoreRepository(corrupt.storage);
 check(corruptRepo.list().length===0&&corruptRepo.issues()[0]?.type==="CORRUPTED","scenario H corrupt storage is recoverable without crash");
 const mismatch=memoryStorage();mismatch.memory.set(STORE_REPOSITORY_KEY,JSON.stringify([{storeFormatVersion:99,createdBy:"USER"}]));
 check(new LocalStoreRepository(mismatch.storage).issues()[0]?.type==="VERSION_MISMATCH","unsupported version is explicit");
 check(memory.has(STORE_REPOSITORY_KEY)&&stores.length===3,"repository/demo regression");
 console.log(`- recovery A-H complete; user stores=${repo.list().length}, demo stores=${stores.length}`);
}
