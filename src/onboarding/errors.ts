export function userFacingError(error:unknown,context:"IMPORT"|"SAVE"|"ANALYZE"|"GENERAL"="GENERAL"){
  if(import.meta.env.DEV)console.error(`[onboarding:${context}]`,error);
  if(context==="IMPORT")return "파일을 읽지 못했습니다. CSV 또는 JSON 형식과 필수 값을 확인해 주세요.";
  if(context==="SAVE")return "변경 내용을 저장하지 못했습니다. 브라우저 저장 공간을 확인한 뒤 다시 시도해 주세요.";
  if(context==="ANALYZE")return "일부 메뉴를 자동 분석하지 못했습니다. 기본값으로 계속 진행해 직접 확인할 수 있습니다.";
  return "처리 중 문제가 발생했습니다. 입력 내용을 확인하고 다시 시도해 주세요.";
}
