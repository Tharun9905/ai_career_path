import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateCoverLetter, getCoverLetters, getCoverLetter, deleteCoverLetter } from "../actions/cover-letter";
import { auth } from "@clerk/nextjs/server";
import { db } from "../lib/prisma";

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
    coverLetter: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
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

describe("cover-letter actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateCoverLetter", () => {
    it("should throw unauthorized if no userId", async () => {
      auth.mockResolvedValue({ userId: null });
      await expect(generateCoverLetter({})).rejects.toThrow("Unauthorized");
    });

    it("should generate cover letter using AI and save to DB", async () => {
      auth.mockResolvedValue({ userId: "user_123" });
      db.user.findUnique.mockResolvedValue({ id: "db_123", industry: "Tech", experience: "5 years", skills: ["React"], bio: "Dev" });

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => "AI Generated Cover Letter",
        },
      });

      db.coverLetter.create.mockResolvedValue({ id: "cl_123", content: "AI Generated Cover Letter" });

      const data = {
        jobTitle: "Frontend Dev",
        companyName: "Tech Co",
        jobDescription: "Build apps",
      };

      const result = await generateCoverLetter(data);

      expect(db.coverLetter.create).toHaveBeenCalledWith({
        data: {
          content: "AI Generated Cover Letter",
          jobDescription: data.jobDescription,
          companyName: data.companyName,
          jobTitle: data.jobTitle,
          status: "completed",
          userId: "db_123",
        },
      });
      expect(result.id).toBe("cl_123");
    });
  });

  describe("getCoverLetters", () => {
    it("should fetch all cover letters for the user", async () => {
      auth.mockResolvedValue({ userId: "user_123" });
      db.user.findUnique.mockResolvedValue({ id: "db_123" });
      db.coverLetter.findMany.mockResolvedValue([{ id: "cl_1" }, { id: "cl_2" }]);

      const result = await getCoverLetters();

      expect(db.coverLetter.findMany).toHaveBeenCalledWith({
        where: { userId: "db_123" },
        orderBy: { createdAt: "desc" },
      });
      expect(result.length).toBe(2);
    });
  });

  describe("getCoverLetter", () => {
    it("should fetch a specific cover letter", async () => {
      auth.mockResolvedValue({ userId: "user_123" });
      db.user.findUnique.mockResolvedValue({ id: "db_123" });
      db.coverLetter.findUnique.mockResolvedValue({ id: "cl_1", userId: "db_123" });

      const result = await getCoverLetter("cl_1");

      expect(db.coverLetter.findUnique).toHaveBeenCalledWith({
        where: { id: "cl_1", userId: "db_123" },
      });
      expect(result.id).toBe("cl_1");
    });
  });

  describe("deleteCoverLetter", () => {
    it("should delete a specific cover letter", async () => {
      auth.mockResolvedValue({ userId: "user_123" });
      db.user.findUnique.mockResolvedValue({ id: "db_123" });
      db.coverLetter.delete.mockResolvedValue({ id: "cl_1" });

      const result = await deleteCoverLetter("cl_1");

      expect(db.coverLetter.delete).toHaveBeenCalledWith({
        where: { id: "cl_1", userId: "db_123" },
      });
      expect(result.id).toBe("cl_1");
    });
  });
});
