import React, { useState } from 'react';

// Fallback images by aspect ratio
const FALLBACKS = {
  landscape: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&h=400&fit=crop&q=60',
  portrait:  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=600&fit=crop&q=60',
  square:    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop&q=60',
  cover:     'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=500&fit=crop&q=60',
};

interface AppImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: keyof typeof FALLBACKS | string;
}

/**
 * Drop-in replacement for <img> that shows a reliable Unsplash fallback
 * when the original source fails to load (picsum down, CORS, 404, etc.)
 */
const AppImage: React.FC<AppImageProps> = ({
  src,
  alt = '',
  fallback = 'landscape',
  className = '',
  ...props
}) => {
  const [failed, setFailed] = useState(false);

  const fallbackSrc = fallback in FALLBACKS
    ? FALLBACKS[fallback as keyof typeof FALLBACKS]
    : fallback;

  return (
    <img
      {...props}
      src={failed ? fallbackSrc : src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        if (!failed) setFailed(true);
      }}
    />
  );
};

export default AppImage;
