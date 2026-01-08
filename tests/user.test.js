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
      update: vi.fn(),
    },
    industryInsight: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb({
      user: {
        update: vi.fn(),
      },
      industryInsight: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    })),
  },
}));

vi.mock('../actions/dashboard', () => ({
  generateAIInsights: vi.fn(),
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

  describe('updateUser', () => {
    it('should throw unauthorized if no userId', async () => {
      auth.mockResolvedValue({ userId: null });
      await expect(updateUser({})).rejects.toThrow('Unauthorized');
    });

    it('should update user and industry insight in a transaction', async () => {
      auth.mockResolvedValue({ userId: 'user_123' });
      db.user.findUnique.mockResolvedValue({ id: 'db_123', industry: 'Old' });

      const mockTx = {
        industryInsight: {
          findUnique: vi.fn().mockResolvedValue({ industry: 'Tech' }),
        },
        user: {
          update: vi.fn().mockResolvedValue({ id: 'db_123', industry: 'Tech' }),
        },
      };
      db.$transaction.mockImplementation(async (cb) => cb(mockTx));

      const updateData = {
        industry: 'Tech',
        experience: '5',
        bio: 'Bio',
        skills: ['React'],
      };

      const result = await updateUser(updateData);

      expect(mockTx.user.update).toHaveBeenCalled();
      expect(result.industry).toBe('Tech');
    });
  });
});
