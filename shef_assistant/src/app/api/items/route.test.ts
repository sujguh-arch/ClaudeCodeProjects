import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { NextRequest } from 'next/server';

// Mock the config-service
vi.mock('@/lib/config-service', () => ({
  getAllItems: vi.fn(),
  createItem: vi.fn(),
}));

// Mock the types module
vi.mock('@/lib/types', () => ({
  isValidShefUrl: vi.fn((url: string) => url.startsWith('https://shef.com/')),
  generateId: vi.fn(() => 'test-uuid-123'),
}));

import { getAllItems, createItem } from '@/lib/config-service';

describe('GET /api/items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all items successfully', async () => {
    const mockItems = [
      { id: '1', name: 'Chicken Tikka', url: 'https://shef.com/dish/1', quantity: 2 },
      { id: '2', name: 'Butter Naan', url: 'https://shef.com/dish/2', quantity: 1 },
    ];
    vi.mocked(getAllItems).mockReturnValue(mockItems);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockItems);
  });

  it('returns empty array when no items exist', async () => {
    vi.mocked(getAllItems).mockReturnValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual([]);
  });

  it('handles errors gracefully', async () => {
    vi.mocked(getAllItems).mockImplementation(() => {
      throw new Error('Config file corrupted');
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Config file corrupted');
  });
});

describe('POST /api/items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new item successfully', async () => {
    const newItem = {
      id: 'new-id',
      name: 'Paneer Tikka',
      url: 'https://shef.com/dish/paneer',
      quantity: 3,
    };
    vi.mocked(createItem).mockReturnValue(newItem);

    const request = new NextRequest('http://localhost/api/items', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Paneer Tikka',
        url: 'https://shef.com/dish/paneer',
        quantity: 3,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(newItem);
    expect(data.message).toBe('Item created successfully');
    expect(createItem).toHaveBeenCalledWith('Paneer Tikka', 'https://shef.com/dish/paneer', 3, {});
  });

  it('defaults quantity to 1 when not provided', async () => {
    const newItem = {
      id: 'new-id',
      name: 'Test Item',
      url: 'https://shef.com/dish/test',
      quantity: 1,
    };
    vi.mocked(createItem).mockReturnValue(newItem);

    const request = new NextRequest('http://localhost/api/items', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Item',
        url: 'https://shef.com/dish/test',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(createItem).toHaveBeenCalledWith('Test Item', 'https://shef.com/dish/test', 1, {});
  });

  it('returns 400 when name is missing', async () => {
    const request = new NextRequest('http://localhost/api/items', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://shef.com/dish/test',
        quantity: 1,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Name is required');
  });

  it('returns 400 when name is empty string', async () => {
    const request = new NextRequest('http://localhost/api/items', {
      method: 'POST',
      body: JSON.stringify({
        name: '   ',
        url: 'https://shef.com/dish/test',
        quantity: 1,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Name is required');
  });

  it('returns 400 when URL is missing', async () => {
    const request = new NextRequest('http://localhost/api/items', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Item',
        quantity: 1,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('URL is required');
  });

  it('returns 400 when URL is not a valid Shef URL', async () => {
    const request = new NextRequest('http://localhost/api/items', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Item',
        url: 'https://google.com/test',
        quantity: 1,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('URL must start with https://shef.com/');
  });

  it('returns 400 when quantity is less than 1', async () => {
    const request = new NextRequest('http://localhost/api/items', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Item',
        url: 'https://shef.com/dish/test',
        quantity: 0,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Quantity must be at least 1');
  });

  it('returns 400 when quantity is negative', async () => {
    const request = new NextRequest('http://localhost/api/items', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Item',
        url: 'https://shef.com/dish/test',
        quantity: -5,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Quantity must be at least 1');
  });

  it('handles createItem errors gracefully', async () => {
    vi.mocked(createItem).mockImplementation(() => {
      throw new Error('Failed to write to config');
    });

    const request = new NextRequest('http://localhost/api/items', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Item',
        url: 'https://shef.com/dish/test',
        quantity: 1,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to write to config');
  });
});
