import { useState, useCallback, useEffect } from 'react';

type Axis = 'x' | 'y';

export function useResizable(
  initialSize: number,
  minSize: number,
  maxSize: number,
  onSizeChange?: (size: number) => void,
  axis: Axis = 'x'
) {
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      let newSize = axis === 'x' ? e.clientX : window.innerHeight - e.clientY;
      
      // For sidebar (left to right), it's clientX.
      // For response (bottom to top), it's window.innerHeight - clientY.
      // Wait, let's make it more robust. 
      // Actually, for ActivityPanel, it was width.
      // For ResponsePanel (bottom), it's height.
      
      // But useResizable is used by both. 
      // Let's passed a direction or just handle it based on axis.
      
      if (newSize < minSize) newSize = minSize;
      if (newSize > maxSize) newSize = maxSize;
      
      setSize(newSize);
      if (onSizeChange) onSizeChange(newSize);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, minSize, maxSize, onSizeChange, axis]);

  return { 
    width: axis === 'x' ? size : 0, 
    height: axis === 'y' ? size : 0, 
    isDragging, 
    startDrag 
  };
}
