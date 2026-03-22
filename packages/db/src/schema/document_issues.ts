import {
  pgTable,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { documents } from "./documents.js";
import { issues } from "./issues.js";

export const documentIssues = pgTable(
  "document_issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
  },
  (table) => ({
    documentIdx: index("document_issues_document_idx").on(table.documentId),
    issueIdx: index("document_issues_issue_idx").on(table.issueId),
    unique: uniqueIndex("document_issues_unique").on(table.documentId, table.issueId),
  }),
);
