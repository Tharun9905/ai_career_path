import { randomUUID } from 'crypto';

const mockData = {
  users: [],
  assessments: [],
  resumes: [],
  coverLetters: [],
  industryInsights: [],
};

function generateId() {
  return randomUUID();
}

function generateCUID() {
  return Math.random().toString(36).substring(2, 15);
}

const mockDb = {
  user: {
    create: async (options) => {
      const id = generateId();
      const newUser = {
        id,
        ...options.data,
        createdAt: new Date(),
        updatedAt: new Date(),
        skills: [],
        bio: null,
        experience: null,
        industry: null,
        imageUrl: null,
        name: null,
      };
      mockData.users.push(newUser);
      return newUser;
    },
    findUnique: async (options) => {
      let user = null;
      if (options.where.clerkUserId) {
        user = mockData.users.find(u => u.clerkUserId === options.where.clerkUserId);
      } else if (options.where.id) {
        user = mockData.users.find(u => u.id === options.where.id);
      } else if (options.where.email) {
        user = mockData.users.find(u => u.email === options.where.email);
      }
      
      if (!user) return null;
      
      if (options.select) {
        const selected = {};
        Object.keys(options.select).forEach(key => {
          selected[key] = user[key];
        });
        return selected;
      }
      
      if (options.include) {
        const included = { ...user };
        if (options.include.industryInsight) {
          included.industryInsight = mockData.industryInsights.find(i => i.industry === user.industry) || null;
        }
        return included;
      }
      
      return user;
    },
    findFirst: async (options) => {
      return mockData.users.find(u => u.clerkUserId === options.where.clerkUserId);
    },
    update: async (options) => {
      const user = mockData.users.find(u => u.id === options.where.id);
      if (user) {
        Object.assign(user, options.data, { updatedAt: new Date() });
      }
      return user;
    },
  },
  assessment: {
    create: async (options) => {
      const id = generateCUID();
      const newAssessment = {
        id,
        ...options.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockData.assessments.push(newAssessment);
      return newAssessment;
    },
    findMany: async (options) => {
      let results = mockData.assessments;
      if (options.where?.userId) {
        results = results.filter(a => a.userId === options.where.userId);
      }
      if (options.orderBy) {
        const [orderKey, orderDir] = Object.entries(options.orderBy)[0];
        results.sort((a, b) => {
          if (a[orderKey] < b[orderKey]) return orderDir === 'asc' ? -1 : 1;
          if (a[orderKey] > b[orderKey]) return orderDir === 'asc' ? 1 : -1;
          return 0;
        });
      }
      return results;
    },
    findUnique: async (options) => {
      return mockData.assessments.find(a => a.id === options.where.id);
    },
  },
  resume: {
    create: async (options) => {
      const id = generateCUID();
      const newResume = {
        id,
        ...options.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockData.resumes.push(newResume);
      return newResume;
    },
    findUnique: async (options) => {
      if (options.where.userId) {
        return mockData.resumes.find(r => r.userId === options.where.userId);
      }
      return mockData.resumes.find(r => r.id === options.where.id);
    },
    update: async (options) => {
      const resume = mockData.resumes.find(r => r.id === options.where.id);
      if (resume) {
        Object.assign(resume, options.data, { updatedAt: new Date() });
      }
      return resume;
    },
    upsert: async (options) => {
      let resume = mockData.resumes.find(r => r.userId === options.where.userId);
      if (resume) {
        Object.assign(resume, options.update, { updatedAt: new Date() });
        return resume;
      } else {
        const id = generateCUID();
        const newResume = {
          id,
          ...options.create,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockData.resumes.push(newResume);
        return newResume;
      }
    },
  },
  coverLetter: {
    create: async (options) => {
      const id = generateCUID();
      const newCoverLetter = {
        id,
        status: 'draft',
        ...options.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockData.coverLetters.push(newCoverLetter);
      return newCoverLetter;
    },
    findMany: async (options) => {
      let results = mockData.coverLetters;
      if (options.where?.userId) {
        results = results.filter(c => c.userId === options.where.userId);
      }
      if (options.orderBy) {
        const [orderKey, orderDir] = Object.entries(options.orderBy)[0];
        results.sort((a, b) => {
          if (a[orderKey] < b[orderKey]) return orderDir === 'asc' ? -1 : 1;
          if (a[orderKey] > b[orderKey]) return orderDir === 'asc' ? 1 : -1;
          return 0;
        });
      }
      return results;
    },
    findUnique: async (options) => {
      const whereKey = Object.keys(options.where)[0];
      if (whereKey === 'id') {
        return mockData.coverLetters.find(c => c.id === options.where.id);
      }
      return mockData.coverLetters.find(c => c[whereKey] === options.where[whereKey]);
    },
    update: async (options) => {
      const coverLetter = mockData.coverLetters.find(c => c.id === options.where.id);
      if (coverLetter) {
        Object.assign(coverLetter, options.data, { updatedAt: new Date() });
      }
      return coverLetter;
    },
    delete: async (options) => {
      const index = mockData.coverLetters.findIndex(c => c.id === options.where.id || (c.userId === options.where.userId && c.id === options.where.id));
      if (index !== -1) {
        const deleted = mockData.coverLetters[index];
        mockData.coverLetters.splice(index, 1);
        return deleted;
      }
      return null;
    },
  },
  industryInsight: {
    create: async (options) => {
      const id = generateCUID();
      const newInsight = {
        id,
        ...options.data,
        createdAt: new Date(),
        lastUpdated: new Date(),
      };
      mockData.industryInsights.push(newInsight);
      return newInsight;
    },
    findUnique: async (options) => {
      return mockData.industryInsights.find(i => i.industry === options.where.industry);
    },
    update: async (options) => {
      const insight = mockData.industryInsights.find(i => i.id === options.where.id);
      if (insight) {
        Object.assign(insight, options.data, { lastUpdated: new Date() });
      }
      return insight;
    },
  },
  $transaction: async (fn) => {
    return fn(mockDb);
  },
};

export default mockDb;
