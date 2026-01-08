import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveResume, getResume, improveWithAI } from "../actions/resume";
import { auth } from "@clerk/nextjs/server";
import { db } from "../lib/prisma";
import { revalidatePath } from "next/cache";

// Mock Clerk
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock("../lib/prisma", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    resume: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// Mock Google Generative AI
const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("resume actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveResume", () => {
    it("should throw unauthorized if no userId", async () => {
      auth.mockResolvedValue({ userId: null });
      await expect(saveResume("content")).rejects.toThrow("Unauthorized");
    });

    it("should upsert resume and revalidate path", async () => {
      auth.mockResolvedValue({ userId: "user_123" });
      db.user.findUnique.mockResolvedValue({ id: "db_123" });
      db.resume.upsert.mockResolvedValue({ id: "resume_123", content: "new content" });

      const result = await saveResume("new content");

      expect(db.resume.upsert).toHaveBeenCalledWith({
        where: { userId: "db_123" },
        update: { content: "new content" },
        create: { userId: "db_123", content: "new content" },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/resume");
      expect(result.content).toBe("new content");
    });
  });

  describe("getResume", () => {
    it("should fetch resume for the authenticated user", async () => {
      auth.mockResolvedValue({ userId: "user_123" });
      db.user.findUnique.mockResolvedValue({ id: "db_123" });
      db.resume.findUnique.mockResolvedValue({ id: "resume_123", content: "resume content" });

      const result = await getResume();

      expect(db.resume.findUnique).toHaveBeenCalledWith({
        where: { userId: "db_123" },
      });
      expect(result.content).toBe("resume content");
    });
  });

  describe("improveWithAI", () => {
    it("should improve content using AI", async () => {
      auth.mockResolvedValue({ userId: "user_123" });
      db.user.findUnique.mockResolvedValue({ id: "db_123", industry: "Tech" });
      
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => "Improved professional content",
        },
      });

      const result = await improveWithAI({ current: "old content", type: "experience" });

      expect(mockGenerateContent).toHaveBeenCalled();
      expect(result).toBe("Improved professional content");
    });

    it("should throw error if AI generation fails", async () => {
      auth.mockResolvedValue({ userId: "user_123" });
      db.user.findUnique.mockResolvedValue({ id: "db_123", industry: "Tech" });
      mockGenerateContent.mockRejectedValue(new Error("AI error"));

      await expect(improveWithAI({ current: "old content", type: "experience" })).rejects.toThrow("Failed to improve content");
    });
  });
});
