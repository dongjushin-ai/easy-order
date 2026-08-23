import { megaMgcRawStore } from "./megaMgcRawStore";
import type { RawStoreData } from "../types/store";

const snackReviewStore: RawStoreData = {
  storeId: "snack-review-demo",
  storeName: "서울분식 검토 데모",
  attributes: [
    { key: "spiciness", label: "매운맛", type: "number", reviewChoices: [{ label: "안 매움", value: 0.05 }, { label: "조금 매움", value: 0.35 }, { label: "매움", value: 0.7 }, { label: "매우 매움", value: 1 }] },
    { key: "fried", label: "튀김 여부", type: "number", reviewChoices: [{ label: "튀김 아님", value: 0 }, { label: "튀긴 메뉴", value: 1 }] },
    { key: "hearty", label: "든든함", type: "number", reviewChoices: [{ label: "가벼움", value: 0.2 }, { label: "보통", value: 0.5 }, { label: "든든함", value: 0.9 }] },
    { key: "broth", label: "국물", type: "number", reviewChoices: [{ label: "국물 없음", value: 0 }, { label: "국물 있음", value: 1 }] },
  ],
  menus: [
    { id: "tteokbokki", name: "매운 떡볶이", price: 4500 },
    { id: "fried-set", name: "모둠튀김", price: 5000 },
    { id: "ramyeon", name: "라면", price: 4500 },
    { id: "secret", name: "오늘의 비밀메뉴", price: 5500, description: "매일 구성이 달라지는 점주 추천 메뉴" },
  ],
};

export const ownerDemoStores = [megaMgcRawStore, snackReviewStore];
