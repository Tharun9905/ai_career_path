"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export const generateAIInsights = async (industry) => {
  const prompt = `
          Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
          {
            "salaryRanges": [
              { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
            ],
            "growthRate": number,
            "demandLevel": "High" | "Medium" | "Low",
            "topSkills": ["skill1", "skill2"],
            "marketOutlook": "Positive" | "Neutral" | "Negative",
            "keyTrends": ["trend1", "trend2"],
            "recommendedSkills": ["skill1", "skill2"]
          }

          IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
          Include at least 5 common roles for salary ranges.
          Growth rate should be a percentage.
          Include at least 5 skills and trends.
        `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    return JSON.parse(cleanedText);
  } catch (error) {
    if (error.message.includes("429")) {
      console.warn("Gemini API quota exceeded, using default insights for industry:", industry);
      // Return default insights with sample data to allow profile update to proceed
      return {
        salaryRanges: [
          { role: "Entry Level", min: 50000, max: 70000, median: 60000, location: "Global" },
          { role: "Mid Level", min: 70000, max: 100000, median: 85000, location: "Global" },
          { role: "Senior Level", min: 100000, max: 150000, median: 125000, location: "Global" }
        ],
        growthRate: 5.0,
        demandLevel: "Medium",
        topSkills: ["Communication", "Problem Solving", "Teamwork"],
        marketOutlook: "Neutral",
        keyTrends: ["Remote Work", "Digital Transformation", "Sustainability"],
        recommendedSkills: ["Leadership", "Project Management", "Data Analysis"]
      };
    }
    throw error; // Re-throw other errors
  }
};

export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  let user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        clerkUserId: userId,
        email: `user-${userId}@example.com`,
        name: "New User",
      },
    });
    return null;
  }

  // If no insights exist, generate them
  if (!user.industryInsight) {
    try {
      const insights = await generateAIInsights(user.industry);

      const industryInsight = await db.industryInsight.create({
        data: {
          industry: user.industry,
          ...insights,
          nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return industryInsight;
    } catch (error) {
      if (error.message.includes("429")) {
        console.warn("Gemini API quota exceeded, creating industry insight with default values for user:", userId);
        // Create with default insights
        const industryInsight = await db.industryInsight.create({
          data: {
            industry: user.industry,
            salaryRanges: [
              { role: "Entry Level", min: 50000, max: 70000, median: 60000, location: "Global" },
              { role: "Mid Level", min: 70000, max: 100000, median: 85000, location: "Global" },
              { role: "Senior Level", min: 100000, max: 150000, median: 125000, location: "Global" }
            ],
            growthRate: 5.0,
            demandLevel: "Medium",
            topSkills: ["Communication", "Problem Solving", "Teamwork"],
            marketOutlook: "Neutral",
            keyTrends: ["Remote Work", "Digital Transformation", "Sustainability"],
            recommendedSkills: ["Leadership", "Project Management", "Data Analysis"],
            nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
        return industryInsight;
      }
      throw error; // Re-throw other errors
    }
  }

  return user.industryInsight;
}
