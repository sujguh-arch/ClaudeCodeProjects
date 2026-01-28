import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ItemCard from './ItemCard';

describe('ItemCard', () => {
  const mockItem = {
    id: 'test-id',
    name: 'Test Dish',
    url: 'https://shef.com/order/test-dish',
    quantity: 2,
  };

  const defaultProps = {
    item: mockItem,
    onQuantityChange: vi.fn(),
    onDelete: vi.fn(),
  };

  it('renders item name', () => {
    render(<ItemCard {...defaultProps} />);
    expect(screen.getByText('Test Dish')).toBeInTheDocument();
  });

  it('renders current quantity', () => {
    render(<ItemCard {...defaultProps} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders link to Shef', () => {
    render(<ItemCard {...defaultProps} />);
    const link = screen.getByText('View on Shef');
    expect(link).toHaveAttribute('href', 'https://shef.com/order/test-dish');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('calls onQuantityChange when increase button is clicked', () => {
    const onQuantityChange = vi.fn();
    render(<ItemCard {...defaultProps} onQuantityChange={onQuantityChange} />);

    const increaseBtn = screen.getByLabelText('Increase quantity');
    fireEvent.click(increaseBtn);

    expect(onQuantityChange).toHaveBeenCalledWith('test-id', 3);
  });

  it('calls onQuantityChange when decrease button is clicked', () => {
    const onQuantityChange = vi.fn();
    render(<ItemCard {...defaultProps} onQuantityChange={onQuantityChange} />);

    const decreaseBtn = screen.getByLabelText('Decrease quantity');
    fireEvent.click(decreaseBtn);

    expect(onQuantityChange).toHaveBeenCalledWith('test-id', 1);
  });

  it('disables decrease button when quantity is 1', () => {
    render(
      <ItemCard
        {...defaultProps}
        item={{ ...mockItem, quantity: 1 }}
      />
    );

    const decreaseBtn = screen.getByLabelText('Decrease quantity');
    expect(decreaseBtn).toBeDisabled();
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    render(<ItemCard {...defaultProps} onDelete={onDelete} />);

    const deleteBtn = screen.getByLabelText('Delete item');
    fireEvent.click(deleteBtn);

    expect(onDelete).toHaveBeenCalledWith('test-id');
  });
});
