import type { Document, DocumentWithLinks, DocumentGoalLink, DocumentIssueLink } from "@paperclipai/shared";
import { api } from "./client";

export const documentsApi = {
  list: (companyId: string, filters?: { projectId?: string; goalId?: string; issueId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set("projectId", filters.projectId);
    if (filters?.goalId) params.set("goalId", filters.goalId);
    if (filters?.issueId) params.set("issueId", filters.issueId);
    const qs = params.toString();
    return api.get<Document[]>(`/companies/${companyId}/documents${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => api.get<DocumentWithLinks>(`/documents/${id}`),
  create: (companyId: string, data: { title: string; issueId: string; content?: Record<string, unknown>; projectId?: string | null }) =>
    api.post<Document>(`/companies/${companyId}/documents`, data),
  update: (id: string, data: { title?: string; content?: Record<string, unknown>; projectId?: string | null }) =>
    api.patch<Document>(`/documents/${id}`, data),
  remove: (id: string) => api.delete<Document>(`/documents/${id}`),
  linkGoal: (id: string, goalId: string) =>
    api.post<DocumentGoalLink>(`/documents/${id}/goals`, { goalId }),
  unlinkGoal: (id: string, goalId: string) =>
    api.delete<DocumentGoalLink>(`/documents/${id}/goals/${goalId}`),
  linkIssue: (id: string, issueId: string) =>
    api.post<DocumentIssueLink>(`/documents/${id}/issues`, { issueId }),
  unlinkIssue: (id: string, issueId: string) =>
    api.delete<DocumentIssueLink>(`/documents/${id}/issues/${issueId}`),
};
