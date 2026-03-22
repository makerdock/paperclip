import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { documents, documentGoals, documentIssues } from "@paperclipai/db";

export function documentService(db: Db) {
  return {
    list: async (
      companyId: string,
      filters?: { projectId?: string; goalId?: string; issueId?: string },
    ) => {
      if (filters?.goalId) {
        const links = await db
          .select({ documentId: documentGoals.documentId })
          .from(documentGoals)
          .where(eq(documentGoals.goalId, filters.goalId));
        const ids = links.map((l) => l.documentId);
        if (ids.length === 0) return [];
        return db
          .select()
          .from(documents)
          .where(and(eq(documents.companyId, companyId), inArray(documents.id, ids)));
      }
      if (filters?.issueId) {
        const links = await db
          .select({ documentId: documentIssues.documentId })
          .from(documentIssues)
          .where(eq(documentIssues.issueId, filters.issueId));
        const ids = links.map((l) => l.documentId);
        if (ids.length === 0) return [];
        return db
          .select()
          .from(documents)
          .where(and(eq(documents.companyId, companyId), inArray(documents.id, ids)));
      }
      const conditions = [eq(documents.companyId, companyId)];
      if (filters?.projectId) {
        conditions.push(eq(documents.projectId, filters.projectId));
      }
      return db
        .select()
        .from(documents)
        .where(and(...conditions));
    },

    getById: async (id: string) => {
      const doc = await db
        .select()
        .from(documents)
        .where(eq(documents.id, id))
        .then((rows) => rows[0] ?? null);
      if (!doc) return null;

      const goals = await db
        .select()
        .from(documentGoals)
        .where(eq(documentGoals.documentId, id));
      const issues = await db
        .select()
        .from(documentIssues)
        .where(eq(documentIssues.documentId, id));

      return { ...doc, goals, issues };
    },

    create: async (
      companyId: string,
      data: {
        title: string;
        issueId: string;
        content?: Record<string, unknown>;
        projectId?: string | null;
        createdByAgentId?: string | null;
        createdByUserId?: string | null;
      },
    ) => {
      const doc = await db
        .insert(documents)
        .values({ ...data, companyId })
        .returning()
        .then((rows) => rows[0]);
      // Auto-link the creating issue
      if (doc) {
        await db
          .insert(documentIssues)
          .values({ documentId: doc.id, issueId: data.issueId })
          .onConflictDoNothing();
      }
      return doc;
    },

    update: (id: string, data: Partial<typeof documents.$inferInsert>) =>
      db
        .update(documents)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(documents.id, id))
        .returning()
        .then((rows) => rows[0] ?? null),

    remove: (id: string) =>
      db
        .delete(documents)
        .where(eq(documents.id, id))
        .returning()
        .then((rows) => rows[0] ?? null),

    linkGoal: (documentId: string, goalId: string) =>
      db
        .insert(documentGoals)
        .values({ documentId, goalId })
        .onConflictDoNothing()
        .returning()
        .then((rows) => rows[0] ?? null),

    unlinkGoal: (documentId: string, goalId: string) =>
      db
        .delete(documentGoals)
        .where(
          and(
            eq(documentGoals.documentId, documentId),
            eq(documentGoals.goalId, goalId),
          ),
        )
        .returning()
        .then((rows) => rows[0] ?? null),

    linkIssue: (documentId: string, issueId: string) =>
      db
        .insert(documentIssues)
        .values({ documentId, issueId })
        .onConflictDoNothing()
        .returning()
        .then((rows) => rows[0] ?? null),

    unlinkIssue: (documentId: string, issueId: string) =>
      db
        .delete(documentIssues)
        .where(
          and(
            eq(documentIssues.documentId, documentId),
            eq(documentIssues.issueId, issueId),
          ),
        )
        .returning()
        .then((rows) => rows[0] ?? null),

    listByGoal: async (goalId: string) => {
      const links = await db
        .select({ documentId: documentGoals.documentId })
        .from(documentGoals)
        .where(eq(documentGoals.goalId, goalId));
      const ids = links.map((l) => l.documentId);
      if (ids.length === 0) return [];
      return db.select().from(documents).where(inArray(documents.id, ids));
    },

    listByIssue: async (issueId: string) => {
      const links = await db
        .select({ documentId: documentIssues.documentId })
        .from(documentIssues)
        .where(eq(documentIssues.issueId, issueId));
      const ids = links.map((l) => l.documentId);
      if (ids.length === 0) return [];
      return db.select().from(documents).where(inArray(documents.id, ids));
    },
  };
}
