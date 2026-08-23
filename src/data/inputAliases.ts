export interface AliasDefinition {
  questionId: string | "*";
  optionId: string;
  aliases: string[];
}

export const inputAliases: AliasDefinition[] = [
  { questionId: "*", optionId: "neutral", aliases: ["아무거나", "상관없어", "상관 없", "잘 모르겠", "모르겠어", "글쎄", "둘 다", "둘다"] },
  { questionId: "temperature", optionId: "cold", aliases: ["차가운", "차갑게", "차가워", "시원한", "시원하게", "아이스", "찬 거", "찬걸"] },
  { questionId: "temperature", optionId: "hot", aliases: ["따뜻한", "따뜻하게", "따뜻해", "뜨거운", "뜨겁게", "핫"] },
  { questionId: "sweetness", optionId: "low", aliases: ["안 달", "안 단", "안단", "덜 달", "단맛 없", "달지 않"] },
  { questionId: "sweetness", optionId: "medium", aliases: ["조금 달", "조금만 달", "살짝 달"] },
  { questionId: "sweetness", optionId: "high", aliases: ["달달한", "달게", "단 거", "달콤", "달았으면"] },
  { questionId: "coffee", optionId: "low", aliases: ["커피 말고", "커피 빼", "커피 아닌", "커피는 싫"] },
  { questionId: "coffee", optionId: "high", aliases: ["커피 먹", "커피 마시", "커피로", "커피가 좋"] },
];
