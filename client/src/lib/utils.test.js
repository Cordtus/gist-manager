import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility function', () => {
  describe('Basic functionality', () => {
    it('merges class names correctly', () => {
      const result = cn('foo', 'bar');
      expect(result).toBe('foo bar');
    });

    it('handles single class name', () => {
      const result = cn('foo');
      expect(result).toBe('foo');
    });

    it('handles empty input', () => {
      const result = cn();
      expect(result).toBe('');
    });
  });

  describe('Conditional classes', () => {
    it('handles conditional classes', () => {
      const result = cn('foo', false && 'bar', 'baz');
      expect(result).toBe('foo baz');
    });

    it('handles truthy conditional', () => {
      const result = cn('foo', true && 'bar');
      expect(result).toBe('foo bar');
    });

    it('handles multiple conditional classes', () => {
      const condition1 = true;
      const condition2 = false;
      const result = cn(
        'base',
        condition1 && 'active',
        condition2 && 'disabled'
      );
      expect(result).toBe('base active');
    });
  });

  describe('Undefined and null handling', () => {
    it('handles undefined', () => {
      const result = cn('foo', undefined, 'bar');
      expect(result).toBe('foo bar');
    });

    it('handles null', () => {
      const result = cn('foo', null, 'bar');
      expect(result).toBe('foo bar');
    });

    it('handles mixed falsy values', () => {
      const result = cn('foo', null, undefined, false, '', 'bar');
      expect(result).toBe('foo bar');
    });
  });

  describe('Tailwind class merging', () => {
    it('merges conflicting Tailwind classes correctly', () => {
      // tailwind-merge should keep the last conflicting class
      const result = cn('px-2', 'px-4');
      expect(result).toBe('px-4');
    });

    it('merges multiple conflicting padding classes', () => {
      const result = cn('p-2', 'p-4', 'p-6');
      expect(result).toBe('p-6');
    });

    it('keeps non-conflicting classes', () => {
      const result = cn('px-2', 'py-4');
      expect(result).toContain('px-2');
      expect(result).toContain('py-4');
    });

    it('handles background color conflicts', () => {
      const result = cn('bg-red-500', 'bg-blue-500');
      expect(result).toBe('bg-blue-500');
    });

    it('handles text color and size separately', () => {
      const result = cn('text-red-500', 'text-lg', 'text-blue-500');
      // Should keep text-lg and text-blue-500
      expect(result).toContain('text-lg');
      expect(result).toContain('text-blue-500');
      expect(result).not.toContain('text-red-500');
    });
  });

  describe('Array and object inputs', () => {
    it('handles arrays of classes', () => {
      const result = cn(['foo', 'bar'], 'baz');
      expect(result).toBe('foo bar baz');
    });

    it('handles nested arrays', () => {
      const result = cn(['foo', ['bar', 'baz']]);
      expect(result).toBe('foo bar baz');
    });

    it('handles objects with boolean values', () => {
      const result = cn({ foo: true, bar: false, baz: true });
      expect(result).toBe('foo baz');
    });

    it('handles mixed array and string inputs', () => {
      const result = cn('base', ['foo', 'bar'], 'end');
      expect(result).toBe('base foo bar end');
    });
  });

  describe('Complex scenarios', () => {
    it('handles component variant patterns', () => {
      const variant = 'primary';
      const size = 'lg';
      const result = cn(
        'button',
        variant === 'primary' && 'bg-blue-500',
        variant === 'secondary' && 'bg-gray-500',
        size === 'sm' && 'text-sm',
        size === 'lg' && 'text-lg'
      );
      expect(result).toBe('button bg-blue-500 text-lg');
    });

    it('handles responsive Tailwind classes', () => {
      const result = cn('text-sm', 'md:text-base', 'lg:text-lg');
      expect(result).toContain('text-sm');
      expect(result).toContain('md:text-base');
      expect(result).toContain('lg:text-lg');
    });

    it('merges hover and focus states correctly', () => {
      const result = cn(
        'bg-blue-500',
        'hover:bg-blue-600',
        'focus:ring-2',
        'focus:ring-blue-300'
      );
      expect(result).toContain('bg-blue-500');
      expect(result).toContain('hover:bg-blue-600');
      expect(result).toContain('focus:ring-2');
      expect(result).toContain('focus:ring-blue-300');
    });

    it('handles dark mode variants', () => {
      const result = cn('bg-white', 'dark:bg-gray-900', 'text-black', 'dark:text-white');
      expect(result).toContain('bg-white');
      expect(result).toContain('dark:bg-gray-900');
      expect(result).toContain('text-black');
      expect(result).toContain('dark:text-white');
    });
  });

  describe('Real-world usage patterns', () => {
    it('handles typical button styling', () => {
      const isDisabled = false;
      const isPrimary = true;
      const result = cn(
        'rounded-md px-4 py-2 font-medium',
        isPrimary && 'bg-blue-500 text-white',
        !isPrimary && 'bg-gray-200 text-gray-800',
        isDisabled && 'opacity-50 cursor-not-allowed'
      );
      expect(result).toContain('rounded-md');
      expect(result).toContain('bg-blue-500');
      expect(result).not.toContain('opacity-50');
    });

    it('handles card component styling', () => {
      const variant = 'elevated';
      const result = cn(
        'rounded-lg border',
        variant === 'elevated' && 'shadow-lg',
        variant === 'flat' && 'shadow-none'
      );
      expect(result).toContain('rounded-lg');
      expect(result).toContain('shadow-lg');
      expect(result).not.toContain('shadow-none');
    });
  });
});
