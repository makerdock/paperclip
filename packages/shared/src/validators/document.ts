import { z } from "zod";

export const createDocumentSchema = z.object({
  title: z.string().min(1),
  issueId: z.string().uuid(),
  content: z.record(z.unknown()).optional(),
  projectId: z.string().uuid().optional().nullable(),
});

export type CreateDocument = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.record(z.unknown()).optional(),
  projectId: z.string().uuid().optional().nullable(),
});

export type UpdateDocument = z.infer<typeof updateDocumentSchema>;

export const linkDocumentGoalSchema = z.object({
  goalId: z.string().uuid(),
});

export type LinkDocumentGoal = z.infer<typeof linkDocumentGoalSchema>;

export const linkDocumentIssueSchema = z.object({
  issueId: z.string().uuid(),
});

export type LinkDocumentIssue = z.infer<typeof linkDocumentIssueSchema>;
