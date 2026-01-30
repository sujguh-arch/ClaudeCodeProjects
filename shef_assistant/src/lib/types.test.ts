import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isValidShefUrl,
  generateId,
  isValidDayOfWeek,
  validateDays,
  getCurrentDayOfWeek,
  isAvailableToday,
  DAYS_OF_WEEK,
  DAY_ABBREVIATIONS,
  type ShefItem,
} from './types';

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

  describe('DAYS_OF_WEEK constant', () => {
    it('contains all 7 days', () => {
      expect(DAYS_OF_WEEK).toHaveLength(7);
      expect(DAYS_OF_WEEK).toContain('monday');
      expect(DAYS_OF_WEEK).toContain('sunday');
    });

    it('starts with monday', () => {
      expect(DAYS_OF_WEEK[0]).toBe('monday');
    });
  });

  describe('DAY_ABBREVIATIONS constant', () => {
    it('has abbreviations for all days', () => {
      expect(DAY_ABBREVIATIONS.monday).toBe('M');
      expect(DAY_ABBREVIATIONS.tuesday).toBe('T');
      expect(DAY_ABBREVIATIONS.wednesday).toBe('W');
      expect(DAY_ABBREVIATIONS.thursday).toBe('Th');
      expect(DAY_ABBREVIATIONS.friday).toBe('F');
      expect(DAY_ABBREVIATIONS.saturday).toBe('Sa');
      expect(DAY_ABBREVIATIONS.sunday).toBe('Su');
    });
  });

  describe('isValidDayOfWeek', () => {
    it('returns true for valid days', () => {
      expect(isValidDayOfWeek('monday')).toBe(true);
      expect(isValidDayOfWeek('friday')).toBe(true);
      expect(isValidDayOfWeek('sunday')).toBe(true);
    });

    it('returns false for invalid days', () => {
      expect(isValidDayOfWeek('Monday')).toBe(false); // case sensitive
      expect(isValidDayOfWeek('mon')).toBe(false);
      expect(isValidDayOfWeek('')).toBe(false);
      expect(isValidDayOfWeek('invalid')).toBe(false);
    });
  });

  describe('validateDays', () => {
    it('filters valid days from array', () => {
      const result = validateDays(['monday', 'tuesday', 'invalid', 'friday']);
      expect(result).toEqual(['monday', 'tuesday', 'friday']);
    });

    it('returns undefined for empty array', () => {
      expect(validateDays([])).toBeUndefined();
    });

    it('returns undefined for non-array input', () => {
      expect(validateDays('monday')).toBeUndefined();
      expect(validateDays(null)).toBeUndefined();
      expect(validateDays(undefined)).toBeUndefined();
    });

    it('returns undefined when all days are invalid', () => {
      expect(validateDays(['invalid', 'notaday'])).toBeUndefined();
    });
  });

  describe('getCurrentDayOfWeek', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns monday for Monday', () => {
      vi.setSystemTime(new Date('2026-01-26T12:00:00')); // Monday
      expect(getCurrentDayOfWeek()).toBe('monday');
    });

    it('returns friday for Friday', () => {
      vi.setSystemTime(new Date('2026-01-30T12:00:00')); // Friday
      expect(getCurrentDayOfWeek()).toBe('friday');
    });

    it('returns sunday for Sunday', () => {
      vi.setSystemTime(new Date('2026-02-01T12:00:00')); // Sunday
      expect(getCurrentDayOfWeek()).toBe('sunday');
    });
  });

  describe('isAvailableToday', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-28T12:00:00')); // Wednesday
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns true when no availableDays is set', () => {
      const item: ShefItem = {
        id: '1',
        name: 'Test',
        url: 'https://shef.com/test',
        quantity: 1,
      };
      expect(isAvailableToday(item)).toBe(true);
    });

    it('returns true when availableDays is empty', () => {
      const item: ShefItem = {
        id: '1',
        name: 'Test',
        url: 'https://shef.com/test',
        quantity: 1,
        availableDays: [],
      };
      expect(isAvailableToday(item)).toBe(true);
    });

    it('returns true when today is in availableDays', () => {
      const item: ShefItem = {
        id: '1',
        name: 'Test',
        url: 'https://shef.com/test',
        quantity: 1,
        availableDays: ['monday', 'wednesday', 'friday'], // Wednesday is today
      };
      expect(isAvailableToday(item)).toBe(true);
    });

    it('returns false when today is not in availableDays', () => {
      const item: ShefItem = {
        id: '1',
        name: 'Test',
        url: 'https://shef.com/test',
        quantity: 1,
        availableDays: ['monday', 'friday'], // Wednesday is today, not in list
      };
      expect(isAvailableToday(item)).toBe(false);
    });
  });
});
