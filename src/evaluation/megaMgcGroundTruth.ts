export type ExpectedRange = readonly [min: number, max: number];

export interface MenuGroundTruth {
  menuId: string;
  numeric: Record<string, ExpectedRange>;
  temperature: readonly string[];
}

const n = (coffee: ExpectedRange, sweetness: ExpectedRange, milk: ExpectedRange, caffeine: ExpectedRange, refreshing: ExpectedRange, creamy: ExpectedRange, fruity: ExpectedRange) => ({ coffee, sweetness, milk, caffeine, refreshing, creamy, fruity });

export const megaMgcGroundTruth: MenuGroundTruth[] = [
  { menuId: "americano", temperature: ["both"], numeric: n([.85, 1], [0, .2], [0, .1], [.7, 1], [.45, .8], [0, .15], [0, .1]) },
  { menuId: "honey-americano", temperature: ["both"], numeric: n([.75, 1], [.45, .75], [0, .15], [.65, 1], [.35, .7], [0, .2], [0, .15]) },
  { menuId: "vanilla-americano", temperature: ["both"], numeric: n([.75, 1], [.5, .8], [0, .15], [.65, 1], [.3, .65], [0, .2], [0, .15]) },
  { menuId: "cafe-latte", temperature: ["both"], numeric: n([.55, .85], [.1, .35], [.7, 1], [.5, .85], [.15, .45], [.65, .95], [0, .1]) },
  { menuId: "vanilla-latte", temperature: ["both"], numeric: n([.5, .8], [.65, .9], [.7, 1], [.45, .8], [.1, .35], [.7, 1], [0, .15]) },
  { menuId: "low-sugar-vanilla-latte", temperature: ["both"], numeric: n([.5, .8], [.3, .6], [.7, 1], [.45, .8], [.1, .35], [.65, 1], [0, .15]) },
  { menuId: "cafe-mocha", temperature: ["both"], numeric: n([.45, .75], [.65, .95], [.65, 1], [.4, .75], [.05, .3], [.75, 1], [0, .15]) },
  { menuId: "caramel-macchiato", temperature: ["both"], numeric: n([.5, .8], [.7, 1], [.65, 1], [.45, .8], [.05, .3], [.7, 1], [0, .15]) },
  { menuId: "cold-brew", temperature: ["cold"], numeric: n([.85, 1], [0, .2], [0, .1], [.75, 1], [.55, .9], [0, .15], [0, .1]) },
  { menuId: "cold-brew-latte", temperature: ["cold"], numeric: n([.6, .9], [.1, .35], [.65, 1], [.55, .9], [.3, .65], [.65, .95], [0, .1]) },
  { menuId: "strawberry-latte", temperature: ["cold"], numeric: n([0, .1], [.65, .95], [.65, 1], [0, .15], [.35, .7], [.65, .95], [.7, 1]) },
  { menuId: "green-tea-latte", temperature: ["both"], numeric: n([0, .15], [.4, .75], [.65, 1], [.15, .45], [.15, .45], [.65, .95], [0, .1]) },
  { menuId: "sweet-potato-latte", temperature: ["both"], numeric: n([0, .1], [.6, .9], [.7, 1], [0, .15], [.05, .3], [.75, 1], [0, .15]) },
  { menuId: "peach-iced-tea", temperature: ["cold"], numeric: n([0, .1], [.55, .9], [0, .1], [.15, .5], [.7, 1], [0, .1], [.65, 1]) },
  { menuId: "lemonade", temperature: ["cold"], numeric: n([0, .1], [.45, .8], [0, .1], [0, .05], [.8, 1], [0, .1], [.75, 1]) },
  { menuId: "grapefruit-ade", temperature: ["cold"], numeric: n([0, .1], [.4, .75], [0, .1], [0, .05], [.8, 1], [0, .1], [.75, 1]) },
  { menuId: "strawberry-banana", temperature: ["cold"], numeric: n([0, .1], [.65, .95], [.05, .35], [0, .05], [.55, .85], [.35, .7], [.8, 1]) },
  { menuId: "plain-yogurt-smoothie", temperature: ["cold"], numeric: n([0, .1], [.5, .8], [.45, .8], [0, .05], [.45, .75], [.7, 1], [.1, .4]) },
  { menuId: "real-choco-frappe", temperature: ["cold"], numeric: n([0, .2], [.75, 1], [.55, .9], [0, .2], [.1, .35], [.75, 1], [0, .15]) },
  { menuId: "signature-blend", temperature: ["hot", "cold", "both"], numeric: n([.2, .8], [.2, .8], [.1, .8], [.15, .8], [.15, .8], [.1, .8], [.1, .8]) },
];

export const megaMgcSmokeMenuIds = ["americano", "vanilla-latte", "sweet-potato-latte", "lemonade", "signature-blend"] as const;
