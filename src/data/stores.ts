import { loadStoreData } from "./storeLoader";
import type { RawStoreData } from "../types/store";

const cafe: RawStoreData = {
  storeId: "cafe",
  storeName: "이지 카페",
  defaultOptionGroupIds: ["size", "dining"],
  orderOptionGroups: [
    { id: "size", label: "크기", required: true, choices: [{ id: "regular", label: "보통", priceDelta: 0 }, { id: "large", label: "큰 사이즈", priceDelta: 700 }] },
    { id: "shot", label: "샷 추가", required: true, choices: [{ id: "none", label: "추가 안 함", priceDelta: 0 }, { id: "one", label: "샷 1개 추가", priceDelta: 500 }, { id: "two", label: "샷 2개 추가", priceDelta: 1000 }] },
    { id: "dining", label: "이용 방법", required: true, choices: [{ id: "here", label: "매장에서 먹기", priceDelta: 0 }, { id: "takeout", label: "포장하기", priceDelta: 0 }] },
  ],
  attributes: [
    { key: "temperature", label: "온도", type: "category", question: "따뜻한 음료와 시원한 음료 중 어느 쪽이 좋으세요?", options: [
      { value: "hot", label: "따뜻한 음료" }, { value: "cold", label: "시원한 음료" }, { value: "both", label: "둘 다 좋아요" },
    ] },
    { key: "coffee", label: "커피 맛", type: "number", question: "커피 맛이 나는 음료를 원하시나요?", lowLabel: "커피 아닌 음료", highLabel: "커피 음료" },
    { key: "sweetness", label: "단맛", type: "number", question: "달콤한 음료를 원하시나요?", lowLabel: "덜 달게", highLabel: "달콤하게" },
    { key: "milk", label: "우유", type: "number", question: "우유가 들어간 음료가 좋으신가요?", lowLabel: "우유 없이", highLabel: "우유와 함께" },
    { key: "caffeine", label: "카페인", type: "number", question: "카페인이 필요하신가요?", lowLabel: "카페인 없이", highLabel: "카페인 있게" },
    { key: "refreshing", label: "상쾌함", type: "number", question: "상쾌한 음료를 원하시나요?", lowLabel: "진하고 편안하게", highLabel: "상쾌하게" },
    { key: "creamy", label: "부드러움", type: "number", question: "부드럽고 크리미한 맛이 좋으신가요?", lowLabel: "깔끔하게", highLabel: "부드럽게" },
    { key: "fruity", label: "과일 풍미", type: "number", question: "과일 풍미가 있는 음료를 원하시나요?", lowLabel: "과일 풍미 없이", highLabel: "과일 풍미 있게" },
  ],
  menus: [
    { id: "americano-ice", name: "아이스 아메리카노", price: 4500, optionGroupIds: ["size", "shot", "dining"], attributes: { temperature: "cold", coffee: 1, sweetness: 0, milk: 0, caffeine: 1, refreshing: 0.9, creamy: 0, fruity: 0 } },
    { id: "americano-hot", name: "따뜻한 아메리카노", price: 4500, attributes: { temperature: "hot", coffee: 1, sweetness: 0, milk: 0, caffeine: 1, refreshing: 0.2, creamy: 0, fruity: 0 } },
    { id: "cafe-latte-ice", name: "아이스 카페라떼", price: 5000, attributes: { temperature: "cold", coffee: 0.7, sweetness: 0.1, milk: 1, caffeine: 0.7, refreshing: 0.6, creamy: 0.9, fruity: 0 } },
    { id: "vanilla-latte", name: "아이스 바닐라라떼", price: 5500, attributes: { temperature: "cold", coffee: 0.6, sweetness: 0.85, milk: 1, caffeine: 0.65, refreshing: 0.5, creamy: 0.9, fruity: 0 } },
    { id: "cold-brew", name: "콜드브루", price: 5000, attributes: { temperature: "cold", coffee: 1, sweetness: 0, milk: 0, caffeine: 1, refreshing: 0.85, creamy: 0.1, fruity: 0.05 } },
    { id: "chocolate-latte", name: "초코라떼", price: 5200, attributes: { temperature: "both", coffee: 0, sweetness: 0.9, milk: 1, caffeine: 0.1, refreshing: 0.3, creamy: 1, fruity: 0 } },
    { id: "strawberry-latte", name: "딸기라떼", price: 5500, attributes: { temperature: "cold", coffee: 0, sweetness: 0.8, milk: 1, caffeine: 0, refreshing: 0.65, creamy: 0.8, fruity: 0.8 } },
    { id: "lemonade", name: "레몬에이드", price: 5000, attributes: { temperature: "cold", coffee: 0, sweetness: 0.65, milk: 0, caffeine: 0, refreshing: 1, creamy: 0, fruity: 1 } },
  ],
};

const snack: RawStoreData = {
  storeId: "snack",
  storeName: "서울 분식",
  defaultOptionGroupIds: ["portion", "dining"],
  orderOptionGroups: [
    { id: "portion", label: "양", required: true, choices: [{ id: "regular", label: "보통", priceDelta: 0 }, { id: "large", label: "곱빼기", priceDelta: 1000 }] },
    { id: "spice", label: "맵기", required: true, choices: [{ id: "mild", label: "순한 맛", priceDelta: 0 }, { id: "normal", label: "보통 맛", priceDelta: 0 }, { id: "hot", label: "매운 맛", priceDelta: 0 }] },
    { id: "dining", label: "이용 방법", required: true, choices: [{ id: "here", label: "매장에서 먹기", priceDelta: 0 }, { id: "takeout", label: "포장하기", priceDelta: 0 }] },
  ],
  attributes: [
    { key: "spiciness", label: "매운맛", type: "number", question: "매운 음식을 선호하시나요?", lowLabel: "순한 메뉴", highLabel: "매운 메뉴" },
    { key: "fried", label: "바삭함", type: "number", question: "바삭하게 튀긴 메뉴가 좋으신가요?", lowLabel: "튀기지 않은 메뉴", highLabel: "튀긴 메뉴" },
    { key: "hearty", label: "든든함", type: "number", question: "든든하게 먹을 메뉴를 찾으시나요?", lowLabel: "가볍게", highLabel: "든든하게" },
    { key: "temperature", label: "온도", type: "category", question: "따뜻한 메뉴와 차가운 메뉴 중 어느 쪽이 좋으세요?", options: [
      { value: "hot", label: "따뜻한 메뉴" }, { value: "cold", label: "차가운 메뉴" },
    ] },
  ],
  menus: [
    { id: "tteokbokki", name: "떡볶이", price: 4500, optionGroupIds: ["portion", "spice", "dining"], attributes: { spiciness: 1, fried: 0, hearty: 0.8, temperature: "hot" } },
    { id: "gimbap", name: "김밥", price: 3500, attributes: { spiciness: 0.1, fried: 0, hearty: 0.8, temperature: "cold" } },
    { id: "sundae", name: "순대", price: 5000, attributes: { spiciness: 0.2, fried: 0, hearty: 0.7, temperature: "hot" } },
    { id: "fried-set", name: "모둠튀김", price: 5500, attributes: { spiciness: 0, fried: 1, hearty: 0.5, temperature: "hot" } },
    { id: "ramyeon", name: "라면", price: 4500, attributes: { spiciness: 0.7, fried: 0, hearty: 0.9, temperature: "hot" } },
    { id: "jjolmyeon", name: "쫄면", price: 5500, attributes: { spiciness: 0.6, fried: 0, hearty: 0.7, temperature: "cold" } },
  ],
};

export const stores = [loadStoreData(cafe), loadStoreData(snack)];
