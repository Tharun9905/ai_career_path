import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

describe('cn', () => {
  it('should merge classes correctly', () => {
    expect(cn('btn', 'btn-primary')).toBe('btn btn-primary');
  });

  it('should handle conditional classes', () => {
    expect(cn('btn', true && 'btn-active', false && 'hidden')).toBe('btn btn-active');
  });

  it('should merge tailwind classes', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });
});
