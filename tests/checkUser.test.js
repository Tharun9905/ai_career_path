import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkUser } from '../lib/checkUser';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '../lib/prisma';

// Mock Clerk
vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

// Mock Prisma
vi.mock('../lib/prisma', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('checkUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null if no user is logged in', async () => {
    currentUser.mockResolvedValue(null);
    const result = await checkUser();
    expect(result).toBeNull();
  });

  it('should return the existing user if found in the database', async () => {
    const mockClerkUser = {
      id: 'clerk_123',
      firstName: 'Test',
      lastName: 'User',
      imageUrl: 'http://image.com',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
    };
    const mockDbUser = { id: 'db_123', clerkUserId: 'clerk_123', name: 'Test User' };

    currentUser.mockResolvedValue(mockClerkUser);
    db.user.findUnique.mockResolvedValue(mockDbUser);

    const result = await checkUser();

    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { clerkUserId: 'clerk_123' },
    });
    expect(result).toEqual(mockDbUser);
  });

  it('should create and return a new user if not found in the database', async () => {
    const mockClerkUser = {
      id: 'clerk_123',
      firstName: 'Test',
      lastName: 'User',
      imageUrl: 'http://image.com',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
    };
    const mockNewUser = { id: 'db_123', clerkUserId: 'clerk_123', name: 'Test User' };

    currentUser.mockResolvedValue(mockClerkUser);
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue(mockNewUser);

    const result = await checkUser();

    expect(db.user.create).toHaveBeenCalledWith({
      data: {
        clerkUserId: 'clerk_123',
        name: 'Test User',
        imageUrl: 'http://image.com',
        email: 'test@example.com',
      },
    });
    expect(result).toEqual(mockNewUser);
  });
});
