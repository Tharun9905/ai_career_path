import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateUser, getUserOnboardingStatus } from '../actions/user';
import { auth } from '@clerk/nextjs/server';
import { db } from '../lib/prisma';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('../lib/prisma', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('user actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserOnboardingStatus', () => {
    it('should throw unauthorized if no userId', async () => {
      auth.mockResolvedValue({ userId: null });
      await expect(getUserOnboardingStatus()).rejects.toThrow('Unauthorized');
    });

    it('should return isOnboarded true if user has industry', async () => {
      auth.mockResolvedValue({ userId: 'user_123' });
      db.user.findUnique.mockResolvedValue({ id: 'db_123', industry: 'Tech' });

      const result = await getUserOnboardingStatus();
      expect(result.isOnboarded).toBe(true);
    });

    it('should return isOnboarded false if user has no industry', async () => {
      auth.mockResolvedValue({ userId: 'user_123' });
      db.user.findUnique.mockResolvedValue({ id: 'db_123', industry: null });

      const result = await getUserOnboardingStatus();
      expect(result.isOnboarded).toBe(false);
    });
  });
});
