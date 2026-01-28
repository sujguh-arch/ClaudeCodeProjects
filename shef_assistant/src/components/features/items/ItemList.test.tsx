import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ItemList from './ItemList';

describe('ItemList', () => {
  const mockItems = [
    { id: '1', name: 'Item 1', url: 'https://shef.com/order/1', quantity: 2 },
    { id: '2', name: 'Item 2', url: 'https://shef.com/order/2', quantity: 1 },
  ];

  const defaultProps = {
    items: mockItems,
    onQuantityChange: vi.fn(),
    onDelete: vi.fn(),
  };

  it('renders all items', () => {
    render(<ItemList {...defaultProps} />);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('renders empty state when no items', () => {
    render(<ItemList {...defaultProps} items={[]} />);
    expect(screen.getByText('No items configured yet.')).toBeInTheDocument();
    expect(screen.getByText('Add items using the form above.')).toBeInTheDocument();
  });

  it('passes callbacks to ItemCard', () => {
    const onQuantityChange = vi.fn();
    const onDelete = vi.fn();

    render(
      <ItemList
        items={mockItems}
        onQuantityChange={onQuantityChange}
        onDelete={onDelete}
      />
    );

    // Items should be rendered
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });
});
