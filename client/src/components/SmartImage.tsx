// client/src/components/SmartImage.tsx
import React from 'react';
import { pickImage, buildSrcSet, ImageVariants } from '@/lib/pickImage';

type Props = {
  alt: string;
  widthHint?: number; // 이 이미지가 쓰일 대략적인 가로폭(px)
  className?: string;
  src?: string; // 원본 이미지 (variants 없을 때 사용)
  variants?: ImageVariants; // 썸네일/카드/풀 경로들
  onError?: React.ReactEventHandler<HTMLImageElement>; // ★ 추가
};

export default function SmartImage({
  alt,
  widthHint = 720,
  className,
  src,
  variants,
}: Props) {
  const url = pickImage({ variants, src }, widthHint);
  const srcSet = buildSrcSet(variants);

  return (
    <img
      src={url}
      srcSet={srcSet}
      sizes={srcSet ? '(max-width: 768px) 100vw, 720px' : undefined}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={onError}    // ★ 전달
    />
  );
}
