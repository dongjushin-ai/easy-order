import type { Menu } from "../types/menu";

export const menus: Menu[] = [
  { id: "americano_ice", name: "아이스 아메리카노", price: 4500, attributes: { temperature: "cold", coffee: 1, sweetness: 0, milk: 0, caffeine: 1, refreshing: 0.9, creamy: 0, fruity: 0 } },
  { id: "americano_hot", name: "따뜻한 아메리카노", price: 4500, attributes: { temperature: "hot", coffee: 1, sweetness: 0, milk: 0, caffeine: 1, refreshing: 0.2, creamy: 0, fruity: 0 } },
  { id: "cafe_latte_ice", name: "아이스 카페라떼", price: 5000, attributes: { temperature: "cold", coffee: 0.7, sweetness: 0.1, milk: 1, caffeine: 0.7, refreshing: 0.6, creamy: 0.9, fruity: 0 } },
  { id: "vanilla_latte_ice", name: "아이스 바닐라라떼", price: 5500, attributes: { temperature: "cold", coffee: 0.6, sweetness: 0.85, milk: 1, caffeine: 0.65, refreshing: 0.5, creamy: 0.9, fruity: 0 } },
  { id: "cold_brew", name: "콜드브루", price: 5000, attributes: { temperature: "cold", coffee: 1, sweetness: 0, milk: 0, caffeine: 1, refreshing: 0.85, creamy: 0.1, fruity: 0.05 } },
  { id: "chocolate_latte", name: "초코라떼", price: 5200, attributes: { temperature: "both", coffee: 0, sweetness: 0.9, milk: 1, caffeine: 0.1, refreshing: 0.3, creamy: 1, fruity: 0 } },
  { id: "strawberry_latte", name: "딸기라떼", price: 5500, attributes: { temperature: "cold", coffee: 0, sweetness: 0.8, milk: 1, caffeine: 0, refreshing: 0.65, creamy: 0.8, fruity: 0.8 } },
  { id: "lemon_ade", name: "레몬에이드", price: 5000, attributes: { temperature: "cold", coffee: 0, sweetness: 0.65, milk: 0, caffeine: 0, refreshing: 1, creamy: 0, fruity: 1 } },
];
