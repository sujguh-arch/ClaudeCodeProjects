import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ItemForm from './ItemForm';

describe('ItemForm', () => {
  it('renders all form fields', () => {
    render(<ItemForm onAdd={vi.fn()} />);

    expect(screen.getByLabelText('Item Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Shef URL')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
  });

  it('calls onAdd with form values on submit', () => {
    const onAdd = vi.fn();
    render(<ItemForm onAdd={onAdd} />);

    fireEvent.change(screen.getByLabelText('Item Name'), {
      target: { value: 'New Dish' },
    });
    fireEvent.change(screen.getByLabelText('Shef URL'), {
      target: { value: 'https://shef.com/order/new-dish' },
    });
    fireEvent.change(screen.getByLabelText('Quantity'), {
      target: { value: '3' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }));

    expect(onAdd).toHaveBeenCalledWith('New Dish', 'https://shef.com/order/new-dish', 3, { availableDays: undefined, preferredPortion: undefined });
  });

  it('shows error for invalid URL', () => {
    render(<ItemForm onAdd={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Item Name'), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByLabelText('Shef URL'), {
      target: { value: 'https://google.com/invalid' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }));

    expect(screen.getByText('URL must start with https://shef.com/')).toBeInTheDocument();
  });

  it('resets form after successful submit', () => {
    const onAdd = vi.fn();
    render(<ItemForm onAdd={onAdd} />);

    const nameInput = screen.getByLabelText('Item Name') as HTMLInputElement;
    const urlInput = screen.getByLabelText('Shef URL') as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: 'Test Dish' } });
    fireEvent.change(urlInput, { target: { value: 'https://shef.com/order/test' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }));

    expect(nameInput.value).toBe('');
    expect(urlInput.value).toBe('');
  });
});
