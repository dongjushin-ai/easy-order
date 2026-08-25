export const SAMPLE_MENU_CSV={
 cafe:'name,price,description,category\r\n아이스 아메리카노,4500,깔끔하고 시원한 커피,커피\r\n카페라떼,5000,우유가 들어간 부드러운 커피,커피\r\n레몬에이드,5000,상큼한 탄산 음료,에이드\r\n',
 snack:'name,price,description,category\r\n떡볶이,4500,매콤하고 쫄깃한 떡볶이,분식\r\n김밥,3500,가볍고 든든한 김밥,분식\r\n모둠튀김,5500,바삭한 튀김 모음,튀김\r\n',
 fastfood:'name,price,description,category\r\n치즈버거,6500,치즈와 소고기 패티 버거,버거\r\n매운 치킨버거,7000,바삭하고 매운 치킨 버거,버거\r\n감자튀김,3000,바삭한 감자튀김,사이드\r\n',
} as const;
export type SampleMenuKind=keyof typeof SAMPLE_MENU_CSV;
