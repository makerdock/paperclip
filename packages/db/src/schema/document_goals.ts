import {
  pgTable,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { documents } from "./documents.js";
import { goals } from "./goals.js";

export const documentGoals = pgTable(
  "document_goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    goalId: uuid("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  },
  (table) => ({
    documentIdx: index("document_goals_document_idx").on(table.documentId),
    goalIdx: index("document_goals_goal_idx").on(table.goalId),
    unique: uniqueIndex("document_goals_unique").on(table.documentId, table.goalId),
  }),
);
