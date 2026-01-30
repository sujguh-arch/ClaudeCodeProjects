import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useItems } from './useItems';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useItems hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state and fetchItems', () => {
    it('fetches items on mount', async () => {
      const mockItems = [
        { id: '1', name: 'Chicken Tikka', url: 'https://shef.com/dish/1', quantity: 2 },
      ];
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockItems }),
      });

      const { result } = renderHook(() => useItems());

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual(mockItems);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith('/api/items');
    });

    it('handles fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Server error' }),
      });

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.error).toBe('Server error');
    });

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.error).toBe('Network error');
    });

    it('can manually refetch items', async () => {
      const mockItems1 = [{ id: '1', name: 'Item 1', url: 'https://shef.com/1', quantity: 1 }];
      const mockItems2 = [
        { id: '1', name: 'Item 1', url: 'https://shef.com/1', quantity: 1 },
        { id: '2', name: 'Item 2', url: 'https://shef.com/2', quantity: 2 },
      ];

      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, data: mockItems1 }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, data: mockItems2 }),
        });

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual(mockItems1);

      await act(async () => {
        await result.current.fetchItems();
      });

      expect(result.current.items).toEqual(mockItems2);
    });
  });

  describe('addItem', () => {
    it('adds item successfully', async () => {
      const existingItems = [
        { id: '1', name: 'Item 1', url: 'https://shef.com/1', quantity: 1 },
      ];
      const newItem = { id: '2', name: 'New Item', url: 'https://shef.com/2', quantity: 3 };

      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, data: existingItems }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, data: newItem }),
        });

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let addResult: boolean = false;
      await act(async () => {
        addResult = await result.current.addItem('New Item', 'https://shef.com/2', 3);
      });

      expect(addResult).toBe(true);
      expect(result.current.items).toEqual([...existingItems, newItem]);
      expect(mockFetch).toHaveBeenCalledWith('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Item', url: 'https://shef.com/2', quantity: 3 }),
      });
    });

    it('handles add item error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, data: [] }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: false, error: 'Invalid URL' }),
        });

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let addResult: boolean = true;
      await act(async () => {
        addResult = await result.current.addItem('Bad Item', 'invalid-url', 1);
      });

      expect(addResult).toBe(false);
      expect(result.current.error).toBe('Invalid URL');
      expect(result.current.items).toEqual([]);
    });

    it('handles network error during add', async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, data: [] }),
        })
        .mockRejectedValueOnce(new Error('Network failure'));

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let addResult: boolean = true;
      await act(async () => {
        addResult = await result.current.addItem('Item', 'https://shef.com/1', 1);
      });

      expect(addResult).toBe(false);
      expect(result.current.error).toBe('Network failure');
    });
  });

  describe('updateItem', () => {
    it('updates item quantity successfully', async () => {
      const existingItems = [
        { id: '1', name: 'Item 1', url: 'https://shef.com/1', quantity: 1 },
      ];
      const updatedItem = { id: '1', name: 'Item 1', url: 'https://shef.com/1', quantity: 5 };

      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, data: existingItems }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, data: updatedItem }),
        });

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updateResult: boolean = false;
      await act(async () => {
        updateResult = await result.current.updateItem('1', { quantity: 5 });
      });

      expect(updateResult).toBe(true);
      expect(result.current.items[0].quantity).toBe(5);
      expect(mockFetch).toHaveBeenCalledWith('/api/items/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: 5 }),
      });
    });

    it('updates item name successfully', async () => {
      const existingItems = [
        { id: '1', name: 'Old Name', url: 'https://shef.com/1', quantity: 1 },
      ];
      const updatedItem = { id: '1', name: 'New Name', url: 'https://shef.com/1', quantity: 1 };

      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, data: existingItems }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, data: updatedItem }),
        });

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateItem('1', { name: 'New Name' });
      });

      expect(result.current.items[0].name).toBe('New Name');
    });

    it('handles update error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, data: [{ id: '1', name: 'Item', url: 'https://shef.com/1', quantity: 1 }] }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: false, error: 'Item not found' }),
        });

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updateResult: boolean = true;
      await act(async () => {
        updateResult = await result.current.updateItem('non-existent', { quantity: 5 });
      });

      expect(updateResult).toBe(false);
      expect(result.current.error).toBe('Item not found');
    });
  });

  describe('deleteItem', () => {
    it('deletes item successfully', async () => {
      const existingItems = [
        { id: '1', name: 'Item 1', url: 'https://shef.com/1', quantity: 1 },
        { id: '2', name: 'Item 2', url: 'https://shef.com/2', quantity: 2 },
      ];

      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, data: existingItems }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true }),
        });

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items.length).toBe(2);

      let deleteResult: boolean = false;
      await act(async () => {
        deleteResult = await result.current.deleteItem('1');
      });

      expect(deleteResult).toBe(true);
      expect(result.current.items.length).toBe(1);
      expect(result.current.items[0].id).toBe('2');
      expect(mockFetch).toHaveBeenCalledWith('/api/items/1', { method: 'DELETE' });
    });

    it('handles delete error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, data: [{ id: '1', name: 'Item', url: 'https://shef.com/1', quantity: 1 }] }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: false, error: 'Item not found' }),
        });

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deleteResult: boolean = true;
      await act(async () => {
        deleteResult = await result.current.deleteItem('non-existent');
      });

      expect(deleteResult).toBe(false);
      expect(result.current.error).toBe('Item not found');
      expect(result.current.items.length).toBe(1); // Original item still there
    });

    it('handles network error during delete', async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, data: [{ id: '1', name: 'Item', url: 'https://shef.com/1', quantity: 1 }] }),
        })
        .mockRejectedValueOnce(new Error('Network failure'));

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deleteResult: boolean = true;
      await act(async () => {
        deleteResult = await result.current.deleteItem('1');
      });

      expect(deleteResult).toBe(false);
      expect(result.current.error).toBe('Network failure');
    });
  });

  describe('error clearing', () => {
    it('clears error on successful operation', async () => {
      // First, cause an error
      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: false, error: 'Initial error' }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, data: [] }),
        });

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      // Refetch should clear error
      await act(async () => {
        await result.current.fetchItems();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
