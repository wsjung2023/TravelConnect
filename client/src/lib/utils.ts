// 클라이언트 유틸리티 — Tailwind 클래스 병합(cn), 날짜 포맷, 문자열 처리 등 UI 전반에서 사용하는 헬퍼 함수 모음.
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
