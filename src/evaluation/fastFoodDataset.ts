import type { EvaluationDataset } from "./dataset";
import type { MenuGroundTruth } from "./megaMgcGroundTruth";
import type { AttributeDefinition, RawStoreData, RawStoreMenu } from "../types/store";

export const FAST_FOOD_DATASET_VERSION="fastfood20-v1";export const FAST_FOOD_CORE_ATTRIBUTES=["spiciness","fried","cheesy","meaty","hearty","crispy","greasy","fresh"] as const;type Key=(typeof FAST_FOOD_CORE_ATTRIBUTES)[number];type Profile=Record<Key,number>;
const choices=(labels:string[])=>labels.map((label,i)=>({label,value:i/(labels.length-1)}));
const def=(key:Key,label:string,question:string,lowLabel:string,highLabel:string):AttributeDefinition=>({key,label,type:"number",question,lowLabel,highLabel,reviewChoices:choices([lowLabel,"보통",highLabel])});
export const fastFoodAttributeSchema:AttributeDefinition[]=[def("spiciness","매운맛","매운 메뉴가 좋으세요?","맵지 않게","매우 맵게"),def("fried","튀김 중심","튀긴 메뉴가 좋으세요?","튀기지 않은 메뉴","튀김이 핵심"),def("cheesy","치즈 풍미","치즈가 들어간 메뉴가 좋으세요?","치즈 없이","치즈 풍미가 강하게"),def("meaty","고기 비중","고기가 많은 메뉴가 좋으세요?","고기 없이","고기 비중이 높게"),def("hearty","든든함","든든한 한 끼를 찾으세요?","가볍게","매우 든든하게"),def("crispy","바삭함","바삭한 메뉴가 좋으세요?","부드럽게","매우 바삭하게"),def("greasy","기름진 정도","진하고 기름진 메뉴가 좋으세요?","담백하게","기름진 풍미로"),def("fresh","신선함","가볍고 신선한 메뉴가 좋으세요?","채소 느낌 없이","채소와 신선함 중심")];
const burgerGroups=["meal","side","drink","extra-cheese","extra-patty","dining"];
const menu=(id:string,name:string,price:number,category:string,description:string,profile:Profile,optionGroupIds:string[]=["dining"]):RawStoreMenu&{profile:Profile}=>({id,name,price,category,description,attributes:profile,profile,optionGroupIds});
const menus=[
menu("classic-burger","기본 햄버거",5000,"버거","소고기 패티와 채소를 넣은 기본 버거",{spiciness:.05,fried:.1,cheesy:.05,meaty:.8,hearty:.7,crispy:.25,greasy:.55,fresh:.35},burgerGroups),
menu("cheese-burger","치즈버거",5700,"버거","소고기 패티와 치즈가 어우러진 버거",{spiciness:.05,fried:.1,cheesy:.85,meaty:.8,hearty:.75,crispy:.2,greasy:.65,fresh:.25},burgerGroups),
menu("double-cheese-burger","더블 치즈버거",7500,"버거","패티 두 장과 치즈 두 장을 넣은 든든한 버거",{spiciness:.05,fried:.1,cheesy:1,meaty:1,hearty:1,crispy:.2,greasy:.85,fresh:.15},burgerGroups),
menu("bacon-burger","베이컨버거",6800,"버거","베이컨과 소고기 패티의 진한 풍미",{spiciness:.1,fried:.2,cheesy:.25,meaty:.95,hearty:.85,crispy:.55,greasy:.85,fresh:.2},burgerGroups),
menu("spicy-chicken-burger","매운 치킨버거",6500,"버거","매운 소스와 바삭한 치킨 패티 버거",{spiciness:.9,fried:.9,cheesy:.1,meaty:.75,hearty:.8,crispy:.9,greasy:.7,fresh:.25},burgerGroups),
menu("shrimp-burger","새우버거",6200,"버거","바삭한 새우 패티와 양상추를 넣은 버거",{spiciness:.1,fried:.9,cheesy:.05,meaty:.2,hearty:.65,crispy:.85,greasy:.6,fresh:.4},burgerGroups),
menu("bulgogi-burger","불고기버거",6000,"버거","달큰한 불고기 소스와 소고기 패티 버거",{spiciness:.05,fried:.1,cheesy:.05,meaty:.85,hearty:.75,crispy:.2,greasy:.5,fresh:.3},burgerGroups),
menu("fried-chicken","후라이드 치킨",9800,"치킨","겉은 바삭하고 속은 촉촉한 치킨",{spiciness:.05,fried:1,cheesy:0,meaty:.9,hearty:.85,crispy:1,greasy:.85,fresh:.05},["meal","side","drink","dining"]),
menu("spicy-chicken","매운 치킨",10500,"치킨","매운 양념을 입힌 바삭한 치킨",{spiciness:1,fried:1,cheesy:0,meaty:.9,hearty:.85,crispy:.75,greasy:.85,fresh:.05},["meal","side","drink","dining"]),
menu("chicken-tenders","치킨텐더",6500,"치킨","먹기 좋은 크기의 바삭한 닭안심 튀김",{spiciness:.1,fried:1,cheesy:0,meaty:.8,hearty:.6,crispy:.95,greasy:.7,fresh:.05},["meal","side","drink","dining"]),
menu("fries","감자튀김",3000,"사이드","노릇하고 바삭한 감자튀김",{spiciness:0,fried:1,cheesy:0,meaty:0,hearty:.35,crispy:.9,greasy:.75,fresh:.05}),
menu("cheese-fries","치즈 감자튀김",4200,"사이드","감자튀김 위에 진한 치즈 소스를 더한 메뉴",{spiciness:0,fried:1,cheesy:1,meaty:0,hearty:.5,crispy:.7,greasy:.9,fresh:.05}),
menu("onion-rings","어니언링",3500,"사이드","양파를 바삭하게 튀긴 가벼운 사이드",{spiciness:0,fried:1,cheesy:0,meaty:0,hearty:.25,crispy:1,greasy:.7,fresh:.15}),
menu("cheese-sticks","치즈스틱",4000,"사이드","치즈를 바삭하게 튀긴 스틱",{spiciness:0,fried:1,cheesy:1,meaty:0,hearty:.4,crispy:.85,greasy:.85,fresh:0}),
menu("chicken-salad","치킨 샐러드",7200,"샐러드","구운 닭고기와 신선한 채소를 담은 샐러드",{spiciness:.05,fried:.1,cheesy:.1,meaty:.55,hearty:.55,crispy:.25,greasy:.2,fresh:1}),
menu("garden-salad","기본 샐러드",5200,"샐러드","여러 채소를 담은 가볍고 신선한 샐러드",{spiciness:0,fried:0,cheesy:.05,meaty:0,hearty:.2,crispy:.2,greasy:.05,fresh:1}),
menu("hot-dog","핫도그",4800,"기타","소시지와 부드러운 번으로 만든 핫도그",{spiciness:.05,fried:.1,cheesy:.05,meaty:.75,hearty:.6,crispy:.15,greasy:.6,fresh:.15},burgerGroups),
menu("nuggets","치킨 너겟",4500,"기타","한입 크기의 바삭한 치킨 너겟",{spiciness:.05,fried:1,cheesy:0,meaty:.7,hearty:.45,crispy:.9,greasy:.7,fresh:0},["meal","side","drink","dining"]),
menu("ice-cream","아이스크림",2500,"디저트","차갑고 부드러운 바닐라 아이스크림",{spiciness:0,fried:0,cheesy:0,meaty:0,hearty:.15,crispy:0,greasy:.25,fresh:.1}),
menu("soda","탄산음료",2200,"음료","시원하고 청량한 탄산음료",{spiciness:0,fried:0,cheesy:0,meaty:0,hearty:.05,crispy:0,greasy:0,fresh:.15}),
] as const;
export const fastFoodRawStore:RawStoreData={storeId:"fast-food-store",storeName:"Fast Food Store",attributes:fastFoodAttributeSchema,defaultOptionGroupIds:["dining"],orderOptionGroups:[{id:"meal",label:"구성",required:true,choices:[{id:"single",label:"단품",priceDelta:0},{id:"set",label:"세트",priceDelta:2500}]},{id:"side",label:"세트 사이드",required:true,visibleWhen:{groupId:"meal",choiceId:"set"},choices:[{id:"fries",label:"감자튀김",priceDelta:0},{id:"onion-rings",label:"어니언링",priceDelta:500},{id:"salad",label:"샐러드",priceDelta:700}]},{id:"drink",label:"세트 음료",required:true,visibleWhen:{groupId:"meal",choiceId:"set"},choices:[{id:"cola",label:"콜라",priceDelta:0},{id:"zero-cola",label:"제로콜라",priceDelta:0},{id:"cider",label:"사이다",priceDelta:0}]},{id:"extra-cheese",label:"치즈 추가",required:true,choices:[{id:"none",label:"추가 안 함",priceDelta:0},{id:"add",label:"치즈 추가",priceDelta:500}]},{id:"extra-patty",label:"패티 추가",required:true,choices:[{id:"none",label:"추가 안 함",priceDelta:0},{id:"add",label:"패티 추가",priceDelta:1500}]},{id:"dining",label:"이용 방법",required:true,choices:[{id:"here",label:"매장",priceDelta:0},{id:"takeout",label:"포장",priceDelta:0}]}],menus:menus.map(({profile:_p,...m})=>m)};
const range=(v:number):readonly[number,number]=>[Math.max(0,Number((v-.12).toFixed(2))),Math.min(1,Number((v+.12).toFixed(2)))];export const fastFoodGroundTruth:MenuGroundTruth[]=menus.map(m=>({menuId:m.id,temperature:[],numeric:Object.fromEntries(FAST_FOOD_CORE_ATTRIBUTES.map(a=>[a,range(m.profile[a])]))}));
export const fastFoodStoreDataset:EvaluationDataset={id:"fast-food-store",version:FAST_FOOD_DATASET_VERSION,store:fastFoodRawStore,groundTruth:fastFoodGroundTruth,coreAttributes:FAST_FOOD_CORE_ATTRIBUTES,smokeMenuIds:["double-cheese-burger","spicy-chicken-burger","fries","chicken-salad","cheese-sticks"],provisionalAttributeReliability:{fried:"A",cheesy:"A",meaty:"A",spiciness:"B",crispy:"B",fresh:"B",hearty:"C",greasy:"C"}};
