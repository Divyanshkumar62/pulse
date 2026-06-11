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
      <div
        className={className}
        title={title}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
          color: 'white',
          fontWeight: 700,
          fontSize: style?.width ? `calc(${style.width} * 0.45)` : '12px',
          lineHeight: 1,
          borderRadius: '50%',
          ...style,
        }}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      title={title}
      onError={() => setHasError(true)}
    />
  );
};
