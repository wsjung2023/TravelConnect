// 이미지 선택 유틸 — 파일 선택 다이얼로그를 열고, 선택된 이미지를 Base64 또는 File 객체로 반환한다.

export type ImageVariants = {
  thumb?: string;   // 320px 정도
  card?: string;    // 720px 정도
  full?: string;    // 1600px 정도
};

export function pickImage(
  input: { variants?: ImageVariants; src?: string },
  px: number
) {
  const v = input.variants;
  // variants가 있으면 사이즈 기준으로 선택
  if (v) {
    if (px <= 360 && v.thumb) return v.thumb;
    if (px <= 900 && v.card) return v.card;
    return v.full || v.card || v.thumb || input.src || "";
  }
  // 없으면 원본으로 fallback
  return input.src || "";
}

// srcset도 같이 쓰고 싶을 때
export function buildSrcSet(v?: ImageVariants) {
  if (!v) return undefined;
  const parts: string[] = [];
  if (v.thumb) parts.push(`${v.thumb} 320w`);
  if (v.card)  parts.push(`${v.card} 720w`);
  if (v.full)  parts.push(`${v.full} 1600w`);
  return parts.length ? parts.join(", ") : undefined;
}
