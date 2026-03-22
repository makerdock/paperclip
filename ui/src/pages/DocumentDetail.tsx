import { useEffect, useCallback, useState } from "react";
import { useParams } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../api/documents";
import { projectsApi } from "../api/projects";
import { goalsApi } from "../api/goals";
import { issuesApi } from "../api/issues";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { DocumentEditor } from "../components/DocumentEditor";
import { PageSkeleton } from "../components/PageSkeleton";
import { InlineEditor } from "../components/InlineEditor";
import { Badge } from "@/components/ui/badge";
import { X, MessageSquare, FileText } from "lucide-react";
import type { JSONContent } from "novel";
import type { Goal, Project } from "@paperclipai/shared";

export function DocumentDetail() {
  const { documentId } = useParams<{ documentId: string }>();
  const { selectedCompanyId, setSelectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: doc, isLoading, error } = useQuery({
    queryKey: queryKeys.documents.detail(documentId!),
    queryFn: () => documentsApi.get(documentId!),
    enabled: !!documentId,
  });

  const resolvedCompanyId = doc?.companyId ?? selectedCompanyId;

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(resolvedCompanyId!),
    queryFn: () => projectsApi.list(resolvedCompanyId!),
    enabled: !!resolvedCompanyId,
  });

  const { data: allGoals } = useQuery({
    queryKey: queryKeys.goals.list(resolvedCompanyId!),
    queryFn: () => goalsApi.list(resolvedCompanyId!),
    enabled: !!resolvedCompanyId,
  });

  // Fetch the source issue (the one that created this doc)
  const { data: sourceIssue } = useQuery({
    queryKey: queryKeys.issues.detail(doc?.issueId ?? ""),
    queryFn: () => issuesApi.get(doc!.issueId),
    enabled: !!doc?.issueId,
  });

  // Fetch comments for the source issue
  const { data: issueComments } = useQuery({
    queryKey: [...queryKeys.issues.detail(doc?.issueId ?? ""), "comments"],
    queryFn: () => issuesApi.listComments(doc!.issueId),
    enabled: !!doc?.issueId,
    refetchInterval: 15000, // poll every 15s for new comments
  });

  useEffect(() => {
    if (!doc?.companyId || doc.companyId === selectedCompanyId) return;
    setSelectedCompanyId(doc.companyId, { source: "route_sync" });
  }, [doc?.companyId, selectedCompanyId, setSelectedCompanyId]);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Documents", to: "/documents" },
      { label: doc?.title ?? "Document" },
    ]);
  }, [setBreadcrumbs, doc?.title]);

  const updateDoc = useMutation({
    mutationFn: (data: { title?: string; content?: Record<string, unknown>; projectId?: string | null }) =>
      documentsApi.update(documentId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.detail(documentId!) });
      if (resolvedCompanyId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.documents.list(resolvedCompanyId) });
      }
      setSaving(false);
    },
  });

  const linkGoal = useMutation({
    mutationFn: (goalId: string) => documentsApi.linkGoal(documentId!, goalId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.detail(documentId!) }),
  });

  const unlinkGoal = useMutation({
    mutationFn: (goalId: string) => documentsApi.unlinkGoal(documentId!, goalId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.detail(documentId!) }),
  });

  const handleContentUpdate = useCallback(
    (content: JSONContent) => {
      setSaving(true);
      updateDoc.mutate({ content: content as Record<string, unknown> });
    },
    [updateDoc],
  );

  if (isLoading) return <PageSkeleton variant="detail" />;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;
  if (!doc) return null;

  const linkedGoalIds = new Set(doc.goals?.map((g: any) => g.goalId) ?? []);
  const unlinkedGoals = (allGoals ?? []).filter((g: any) => !linkedGoalIds.has(g.id));

  return (
    <div className="flex gap-6 h-full">
      {/* Main editor area */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Title */}
        <InlineEditor
          value={doc.title}
          onSave={(title: string) => updateDoc.mutate({ title })}
          className="text-2xl font-bold"
        />

        {/* Metadata bar */}
        <div className="flex flex-wrap gap-4 text-sm items-center">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Project:</span>
            <select
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={doc.projectId ?? ""}
              onChange={(e: any) => updateDoc.mutate({ projectId: e.target.value || null })}
            >
              <option value="">None</option>
              {(projects ?? []).map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Linked Goals inline */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground">Goals:</span>
            {doc.goals?.map((link: any) => {
              const goal = (allGoals ?? []).find((g: any) => g.id === link.goalId);
              return (
                <Badge key={link.goalId} variant="secondary" className="gap-1">
                  {goal?.title ?? link.goalId.slice(0, 8)}
                  <button onClick={() => unlinkGoal.mutate(link.goalId)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
            {unlinkedGoals.length > 0 && (
              <select
                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                value=""
                onChange={(e: any) => { if (e.target.value) linkGoal.mutate(e.target.value); }}
              >
                <option value="">+ Link goal...</option>
                {unlinkedGoals.map((g: any) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            )}
          </div>

          {saving && <span className="text-xs text-muted-foreground italic">Saving...</span>}
        </div>

        {/* Editor */}
        <DocumentEditor
          initialContent={doc.content as Record<string, unknown>}
          onUpdate={handleContentUpdate}
        />
      </div>

      {/* Issue sidebar */}
      {sourceIssue && (
        <div className="w-80 shrink-0 border-l border-border pl-4 overflow-y-auto">
          {/* Issue header */}
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <FileText className="h-3 w-3" />
              <span>Source Issue</span>
            </div>
            <h3 className="text-sm font-semibold">{sourceIssue.title}</h3>
            {sourceIssue.identifier && (
              <a
                href={`/${resolvedCompanyId ? "" : ""}issues/${sourceIssue.identifier}`}
                className="text-xs text-primary hover:underline"
              >
                {sourceIssue.identifier}
              </a>
            )}
          </div>

          {/* Issue properties */}
          <div className="space-y-2 mb-4 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className="text-xs">{sourceIssue.status}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Priority</span>
              <span>{sourceIssue.priority}</span>
            </div>
            {sourceIssue.assigneeAgentId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assignee</span>
                <span>{sourceIssue.assigneeAgentId.slice(0, 8)}...</span>
              </div>
            )}
          </div>

          {/* Issue description */}
          {sourceIssue.description && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Description</h4>
              <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                {sourceIssue.description.slice(0, 500)}
                {sourceIssue.description.length > 500 && "..."}
              </p>
            </div>
          )}

          {/* Comments section */}
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
              <MessageSquare className="h-3 w-3" />
              <span>Comments ({(issueComments as any)?.length ?? 0})</span>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(issueComments as any[])?.map((comment: any) => (
                <div key={comment.id} className="border-l-2 border-muted pl-2">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                    <span className="font-medium">
                      {comment.authorAgentId ? `Agent ${comment.authorAgentId.slice(0, 8)}` : "Board"}
                    </span>
                    <span>·</span>
                    <span>{new Date(comment.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs whitespace-pre-wrap leading-relaxed">
                    {comment.body.slice(0, 300)}
                    {comment.body.length > 300 && "..."}
                  </p>
                </div>
              ))}
              {(!issueComments || (issueComments as any[])?.length === 0) && (
                <p className="text-xs text-muted-foreground italic">No comments yet. Comment on the issue to request AI edits.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
