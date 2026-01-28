import { describe, it, expect } from 'vitest';
import { isValidShefUrl, generateId } from './types';

describe('types utilities', () => {
  describe('isValidShefUrl', () => {
    it('returns true for valid Shef URLs', () => {
      expect(isValidShefUrl('https://shef.com/')).toBe(true);
      expect(isValidShefUrl('https://shef.com/order/shef/test')).toBe(true);
      expect(isValidShefUrl('https://shef.com/order/shef/moms-b/dish-123')).toBe(true);
    });

    it('returns false for invalid URLs', () => {
      expect(isValidShefUrl('https://google.com/')).toBe(false);
      expect(isValidShefUrl('http://shef.com/')).toBe(false);
      expect(isValidShefUrl('shef.com/order')).toBe(false);
      expect(isValidShefUrl('')).toBe(false);
    });
  });

  describe('generateId', () => {
    it('generates unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      const id3 = generateId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('generates valid UUID format', () => {
      const id = generateId();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });
  });
});
