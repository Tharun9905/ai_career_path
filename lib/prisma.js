import mockDb from "./mock-db.js";

export const db = globalThis.prisma || mockDb;

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}
