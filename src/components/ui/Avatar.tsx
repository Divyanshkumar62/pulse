import React, { useState } from 'react';

interface AvatarProps {
  src?: string | null;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  fallbackInitial?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  alt, 
  className, 
  style, 
  title, 
  fallbackInitial 
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    const initial = fallbackInitial || (alt ? alt.charAt(0).toUpperCase() : '?');
    return (
      <svg
        viewBox="0 0 100 100"
        className={className}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          display: 'block',
          ...style,
        }}
      >
        {title && <title>{title}</title>}
        <circle cx="50" cy="50" r="50" fill="url(#avatar-grad)" />
        <defs>
          <linearGradient id="avatar-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-primary)" />
            <stop offset="100%" stopColor="var(--accent-hover)" />
          </linearGradient>
        </defs>
        <text
          x="50%"
          y="54%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="white"
          fontSize="45"
          fontWeight="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {initial}
        </text>
      </svg>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
        ...style,
      }}
      title={title}
      onError={() => setHasError(true)}
    />
  );
};
