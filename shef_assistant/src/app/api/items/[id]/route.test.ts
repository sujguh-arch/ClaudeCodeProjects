import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from './route';
import { NextRequest } from 'next/server';

// Mock the config-service
vi.mock('@/lib/config-service', () => ({
  getItemById: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
}));

// Mock the types module
vi.mock('@/lib/types', () => ({
  isValidShefUrl: vi.fn((url: string) => url.startsWith('https://shef.com/')),
}));

import { getItemById, updateItem, deleteItem } from '@/lib/config-service';

function createRouteParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/items/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns item when found', async () => {
    const mockItem = {
      id: 'test-id',
      name: 'Chicken Tikka',
      url: 'https://shef.com/dish/1',
      quantity: 2,
    };
    vi.mocked(getItemById).mockReturnValue(mockItem);

    const request = new NextRequest('http://localhost/api/items/test-id');
    const response = await GET(request, createRouteParams('test-id'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockItem);
    expect(getItemById).toHaveBeenCalledWith('test-id');
  });

  it('returns 404 when item not found', async () => {
    vi.mocked(getItemById).mockReturnValue(null);

    const request = new NextRequest('http://localhost/api/items/non-existent');
    const response = await GET(request, createRouteParams('non-existent'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Item not found');
  });

  it('handles errors gracefully', async () => {
    vi.mocked(getItemById).mockImplementation(() => {
      throw new Error('Database error');
    });

    const request = new NextRequest('http://localhost/api/items/test-id');
    const response = await GET(request, createRouteParams('test-id'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Database error');
  });
});

describe('PUT /api/items/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates item name successfully', async () => {
    const updatedItem = {
      id: 'test-id',
      name: 'Updated Name',
      url: 'https://shef.com/dish/1',
      quantity: 2,
    };
    vi.mocked(updateItem).mockReturnValue(updatedItem);

    const request = new NextRequest('http://localhost/api/items/test-id', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Name' }),
    });
    const response = await PUT(request, createRouteParams('test-id'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(updatedItem);
    expect(data.message).toBe('Item updated successfully');
  });

  it('updates item quantity successfully', async () => {
    const updatedItem = {
      id: 'test-id',
      name: 'Chicken Tikka',
      url: 'https://shef.com/dish/1',
      quantity: 5,
    };
    vi.mocked(updateItem).mockReturnValue(updatedItem);

    const request = new NextRequest('http://localhost/api/items/test-id', {
      method: 'PUT',
      body: JSON.stringify({ quantity: 5 }),
    });
    const response = await PUT(request, createRouteParams('test-id'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.quantity).toBe(5);
  });

  it('updates item URL successfully', async () => {
    const updatedItem = {
      id: 'test-id',
      name: 'Chicken Tikka',
      url: 'https://shef.com/dish/new-url',
      quantity: 2,
    };
    vi.mocked(updateItem).mockReturnValue(updatedItem);

    const request = new NextRequest('http://localhost/api/items/test-id', {
      method: 'PUT',
      body: JSON.stringify({ url: 'https://shef.com/dish/new-url' }),
    });
    const response = await PUT(request, createRouteParams('test-id'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.url).toBe('https://shef.com/dish/new-url');
  });

  it('returns 400 for invalid URL', async () => {
    const request = new NextRequest('http://localhost/api/items/test-id', {
      method: 'PUT',
      body: JSON.stringify({ url: 'https://google.com/invalid' }),
    });
    const response = await PUT(request, createRouteParams('test-id'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('URL must start with https://shef.com/');
  });

  it('returns 400 for empty URL', async () => {
    const request = new NextRequest('http://localhost/api/items/test-id', {
      method: 'PUT',
      body: JSON.stringify({ url: '   ' }),
    });
    const response = await PUT(request, createRouteParams('test-id'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('URL cannot be empty');
  });

  it('returns 400 for empty name', async () => {
    const request = new NextRequest('http://localhost/api/items/test-id', {
      method: 'PUT',
      body: JSON.stringify({ name: '   ' }),
    });
    const response = await PUT(request, createRouteParams('test-id'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Name cannot be empty');
  });

  it('returns 400 for quantity less than 1', async () => {
    const request = new NextRequest('http://localhost/api/items/test-id', {
      method: 'PUT',
      body: JSON.stringify({ quantity: 0 }),
    });
    const response = await PUT(request, createRouteParams('test-id'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Quantity must be at least 1');
  });

  it('returns 400 for non-numeric quantity', async () => {
    const request = new NextRequest('http://localhost/api/items/test-id', {
      method: 'PUT',
      body: JSON.stringify({ quantity: 'five' }),
    });
    const response = await PUT(request, createRouteParams('test-id'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Quantity must be at least 1');
  });

  it('returns 404 when item not found', async () => {
    vi.mocked(updateItem).mockReturnValue(null);

    const request = new NextRequest('http://localhost/api/items/non-existent', {
      method: 'PUT',
      body: JSON.stringify({ quantity: 5 }),
    });
    const response = await PUT(request, createRouteParams('non-existent'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Item not found');
  });

  it('handles errors gracefully', async () => {
    vi.mocked(updateItem).mockImplementation(() => {
      throw new Error('Write error');
    });

    const request = new NextRequest('http://localhost/api/items/test-id', {
      method: 'PUT',
      body: JSON.stringify({ quantity: 5 }),
    });
    const response = await PUT(request, createRouteParams('test-id'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Write error');
  });
});

describe('DELETE /api/items/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes item successfully', async () => {
    vi.mocked(deleteItem).mockReturnValue(true);

    const request = new NextRequest('http://localhost/api/items/test-id', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createRouteParams('test-id'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Item deleted successfully');
    expect(deleteItem).toHaveBeenCalledWith('test-id');
  });

  it('returns 404 when item not found', async () => {
    vi.mocked(deleteItem).mockReturnValue(false);

    const request = new NextRequest('http://localhost/api/items/non-existent', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createRouteParams('non-existent'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Item not found');
  });

  it('handles errors gracefully', async () => {
    vi.mocked(deleteItem).mockImplementation(() => {
      throw new Error('Delete error');
    });

    const request = new NextRequest('http://localhost/api/items/test-id', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createRouteParams('test-id'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Delete error');
  });
});
