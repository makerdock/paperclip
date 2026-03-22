export interface Document {
  id: string;
  companyId: string;
  projectId: string | null;
  title: string;
  content: Record<string, unknown>;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentGoalLink {
  id: string;
  documentId: string;
  goalId: string;
}

export interface DocumentIssueLink {
  id: string;
  documentId: string;
  issueId: string;
}

export interface DocumentWithLinks extends Document {
  goals: DocumentGoalLink[];
  issues: DocumentIssueLink[];
}
