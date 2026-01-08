import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateQuiz, saveQuizResult, getAssessments } from "../actions/interview";
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
    assessment: {
      create: vi.fn(),
      findMany: vi.fn(),
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

describe("interview actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateQuiz", () => {
    it("should throw unauthorized if no userId", async () => {
      auth.mockResolvedValue({ userId: null });
      await expect(generateQuiz()).rejects.toThrow("Unauthorized");
    });

    it("should generate quiz questions using AI", async () => {
      auth.mockResolvedValue({ userId: "user_123" });
      db.user.findUnique.mockResolvedValue({ id: "db_123", industry: "Tech", skills: ["JS"] });

      const mockQuiz = {
        questions: [
          {
            question: "What is JS?",
            options: ["A", "B", "C", "D"],
            correctAnswer: "A",
            explanation: "JS is JavaScript",
          },
        ],
      };

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockQuiz),
        },
      });

      const result = await generateQuiz();

      expect(result).toEqual(mockQuiz.questions);
      expect(mockGenerateContent).toHaveBeenCalled();
    });
  });

  describe("saveQuizResult", () => {
    it("should save quiz result and generate improvement tip if needed", async () => {
      auth.mockResolvedValue({ userId: "user_123" });
      db.user.findUnique.mockResolvedValue({ id: "db_123", industry: "Tech" });

      const questions = [
        { question: "Q1", correctAnswer: "A", explanation: "E1" },
        { question: "Q2", correctAnswer: "B", explanation: "E2" },
      ];
      const answers = ["C", "B"]; // One wrong, one right
      const score = 50;

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => "Focus on basics.",
        },
      });

      db.assessment.create.mockResolvedValue({ id: "asm_123", quizScore: 50 });

      const result = await saveQuizResult(questions, answers, score);

      expect(db.assessment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "db_123",
          quizScore: 50,
          improvementTip: "Focus on basics.",
        }),
      });
      expect(result.id).toBe("asm_123");
    });
  });

  describe("getAssessments", () => {
    it("should return assessments for the user", async () => {
      auth.mockResolvedValue({ userId: "user_123" });
      db.user.findUnique.mockResolvedValue({ id: "db_123" });
      db.assessment.findMany.mockResolvedValue([{ id: "asm_1" }, { id: "asm_2" }]);

      const result = await getAssessments();

      expect(db.assessment.findMany).toHaveBeenCalledWith({
        where: { userId: "db_123" },
        orderBy: { createdAt: "asc" },
      });
      expect(result.length).toBe(2);
    });
  });
});
