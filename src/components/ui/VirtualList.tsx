import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';

interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export default function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 5,
  className = ''
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = items.length * itemHeight;
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + height) / itemHeight) + overscan
  );

  const visibleItems = useMemo(() => {
    const visible = [];
    for (let i = startIndex; i <= endIndex; i++) {
        if (!items[i]) continue;
      visible.push({
        item: items[i],
        index: i,
        top: i * itemHeight
      });
    }
    return visible;
  }, [items, startIndex, endIndex, itemHeight]);

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className={className}
      style={{
        height,
        overflowY: 'auto',
        position: 'relative',
        width: '100%',
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--border-default) transparent'
      }}
    >
      <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
        {visibleItems.map(({ item, index, top }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top,
              left: 0,
              width: '100%',
              height: itemHeight
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}
