import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  readConfig,
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
} from './config-service';

const TEST_CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');
let originalConfig: string | null = null;

describe('config-service (integration)', () => {
  beforeEach(() => {
    // Backup original config
    if (fs.existsSync(TEST_CONFIG_PATH)) {
      originalConfig = fs.readFileSync(TEST_CONFIG_PATH, 'utf-8');
    }
  });

  afterEach(() => {
    // Restore original config
    if (originalConfig) {
      fs.writeFileSync(TEST_CONFIG_PATH, originalConfig);
    }
  });

  describe('readConfig', () => {
    it('reads and returns config object', () => {
      const config = readConfig();
      expect(config).toHaveProperty('shefHomeUrl');
      expect(config).toHaveProperty('cartUrl');
      expect(config).toHaveProperty('items');
      expect(Array.isArray(config.items)).toBe(true);
    });
  });

  describe('getAllItems', () => {
    it('returns array of items', () => {
      const items = getAllItems();
      expect(Array.isArray(items)).toBe(true);
    });
  });

  describe('getItemById', () => {
    it('returns null for non-existent id', () => {
      const item = getItemById('non-existent-id-12345');
      expect(item).toBeNull();
    });
  });

  describe('CRUD operations', () => {
    it('performs full create-read-update-delete cycle', () => {
      // Create
      const newItem = createItem(
        'CRUD Test Item',
        'https://shef.com/order/crud-test',
        2
      );
      expect(newItem.name).toBe('CRUD Test Item');
      expect(newItem.url).toBe('https://shef.com/order/crud-test');
      expect(newItem.quantity).toBe(2);
      expect(newItem.id).toBeDefined();

      const testItemId = newItem.id;

      // Read
      const retrievedItem = getItemById(testItemId);
      expect(retrievedItem).not.toBeNull();
      expect(retrievedItem?.id).toBe(testItemId);
      expect(retrievedItem?.name).toBe('CRUD Test Item');

      // Update
      const updatedItem = updateItem(testItemId, { quantity: 5, name: 'Updated Name' });
      expect(updatedItem?.quantity).toBe(5);
      expect(updatedItem?.name).toBe('Updated Name');
      expect(updatedItem?.url).toBe('https://shef.com/order/crud-test'); // unchanged

      // Delete
      const deleted = deleteItem(testItemId);
      expect(deleted).toBe(true);

      // Verify deleted
      const deletedItem = getItemById(testItemId);
      expect(deletedItem).toBeNull();

      // Delete non-existent returns false
      const deletedAgain = deleteItem(testItemId);
      expect(deletedAgain).toBe(false);
    });
  });

  describe('validation', () => {
    it('trims whitespace from name and url', () => {
      const item = createItem('  Spaced Name  ', '  https://shef.com/order/space  ', 1);
      expect(item.name).toBe('Spaced Name');
      expect(item.url).toBe('https://shef.com/order/space');
      deleteItem(item.id); // cleanup
    });

    it('enforces minimum quantity of 1 on create', () => {
      const item = createItem('Min Qty', 'https://shef.com/order/min', 0);
      expect(item.quantity).toBe(1);
      deleteItem(item.id); // cleanup
    });

    it('enforces minimum quantity of 1 on update', () => {
      const item = createItem('Update Test', 'https://shef.com/order/update', 3);
      const updated = updateItem(item.id, { quantity: 0 });
      expect(updated?.quantity).toBe(1);
      deleteItem(item.id); // cleanup
    });
  });
});
