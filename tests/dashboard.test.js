import { describe, it, expect, vi, beforeEach } from "vitest";
import { getIndustryInsights, generateAIInsights } from "../actions/dashboard";
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
    industryInsight: {
      create: vi.fn(),
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

describe("dashboard actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getIndustryInsights", () => {
    it("should throw unauthorized if no userId", async () => {
      auth.mockResolvedValue({ userId: null });
      await expect(getIndustryInsights()).rejects.toThrow("Unauthorized");
    });

    it("should return existing industry insights if available", async () => {
      auth.mockResolvedValue({ userId: "user_123" });
      const mockInsight = { id: "insight_123", industry: "Tech" };
      db.user.findUnique.mockResolvedValue({
        id: "db_123",
        industry: "Tech",
        industryInsight: mockInsight,
      });

      const result = await getIndustryInsights();
      expect(result).toEqual(mockInsight);
      expect(db.user.findUnique).toHaveBeenCalled();
    });

    it("should generate and return insights if none exist", async () => {
      auth.mockResolvedValue({ userId: "user_123" });
      const mockUser = { id: "db_123", industry: "Tech", industryInsight: null };
      db.user.findUnique.mockResolvedValue(mockUser);

      const mockAIResponse = {
        salaryRanges: [],
        growthRate: 10,
        demandLevel: "High",
        topSkills: [],
        marketOutlook: "Positive",
        keyTrends: [],
        recommendedSkills: [],
      };

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockAIResponse),
        },
      });

      db.industryInsight.create.mockResolvedValue({ id: "new_insight", ...mockAIResponse });

      const result = await getIndustryInsights();

      expect(db.industryInsight.create).toHaveBeenCalled();
      expect(result.id).toBe("new_insight");
    });

    it("should return default insights if Gemini API quota is exceeded (429)", async () => {
      auth.mockResolvedValue({ userId: "user_123" });
      db.user.findUnique.mockResolvedValue({ id: "db_123", industry: "Tech", industryInsight: null });

      mockGenerateContent.mockRejectedValue(new Error("429 Too Many Requests"));

      db.industryInsight.create.mockImplementation(({ data }) => Promise.resolve({ id: "default_insight", ...data }));

      const result = await getIndustryInsights();

      expect(result.id).toBe("default_insight");
      expect(result.demandLevel).toBe("Medium"); // Default value
    });
  });
});
