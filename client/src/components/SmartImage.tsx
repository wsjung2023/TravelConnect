// client/src/components/SmartImage.tsx
import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { pickImage, buildSrcSet, ImageVariants } from '@/lib/pickImage';

type Props = {
  alt: string;
  widthHint?: number;
  className?: string;
  src?: string;
  variants?: ImageVariants;
  onError?: React.ReactEventHandler<HTMLImageElement>;
};

export default function SmartImage({
  alt,
  widthHint = 720,
  className,
  src,
  variants,
  onError,
}: Props) {
  const [hasError, setHasError] = useState(false);
  
  const url = pickImage({ 
    ...(variants && { variants }), 
    ...(src && { src }) 
  }, widthHint);
  const srcSet = buildSrcSet(variants);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    if (onError) {
      onError(e);
    }
  };

  if (hasError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className || ''}`}
        role="img"
        aria-label={alt}
      >
        <ImageOff className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={url}
      srcSet={srcSet}
      sizes={srcSet ? '(max-width: 768px) 100vw, 720px' : undefined}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={handleError}
    />
  );
}
