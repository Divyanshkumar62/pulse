import React, { useState, useEffect, useRef, useMemo } from 'react';

interface VirtualListProps<T> {
  items: T[];
  height: number | string;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export default function VirtualList<T>({ items, height, itemHeight, renderItem, className }: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const visibleCount = typeof height === 'number' 
    ? Math.ceil(height / itemHeight) 
    : 30; // Fallback for string heights like '100%'

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 5);
  const endIndex = Math.min(items.length, startIndex + visibleCount + 10);

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return (
    <div 
      ref={containerRef}
      onScroll={onScroll}
      className={className}
      style={{ 
        height, 
        overflowY: 'auto',
        position: 'relative'
      }}
    >
      <div style={{ height: totalHeight, width: '100%', pointerEvents: 'none' }} />
      <div 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          transform: `translateY(${offsetY}px)`
        }}
      >
        {visibleItems.map((item, index) => renderItem(item, startIndex + index))}
      </div>
    </div>
  );
}
