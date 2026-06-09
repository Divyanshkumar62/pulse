import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmptyState from '../EmptyState';
import { Server } from 'lucide-react';
import React from 'react';

describe('EmptyState Component', () => {
  it('should render the title and description correctly', () => {
    render(
      <EmptyState 
        icon={Server} 
        title="No Data Found" 
        description="Please create a new item to get started." 
      />
    );

    expect(screen.getByText('No Data Found')).toBeDefined();
    expect(screen.getByText('Please create a new item to get started.')).toBeDefined();
  });

  it('should apply the compact style when the compact prop is true', () => {
    const { container } = render(
      <EmptyState 
        icon={Server} 
        title="Compact Mode" 
        description="This is compact." 
        compact={true}
      />
    );

    // Get the title element and verify its font size is smaller
    const title = screen.getByText('Compact Mode');
    expect(title.style.fontSize).toBe('14px');
  });

  it('should render the icon', () => {
    const { container } = render(
      <EmptyState 
        icon={Server} 
        title="Icon Test" 
        description="Testing icon rendering" 
      />
    );

    // The lucide-react icon renders an SVG element
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
    expect(svg).not.toBeNull();
  });
});
