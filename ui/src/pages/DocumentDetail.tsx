import { useEffect, useCallback, useRef, useState } from "react";
import { useParams } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../api/documents";
import { projectsApi } from "../api/projects";
import { goalsApi } from "../api/goals";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { DocumentEditor } from "../components/DocumentEditor";
import { PageSkeleton } from "../components/PageSkeleton";
import { InlineEditor } from "../components/InlineEditor";
import { Button } from "@/components/ui/button";
import { FileText, Link2, X } from "lucide-react";
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

  const linkIssue = useMutation({
    mutationFn: (issueId: string) => documentsApi.linkIssue(documentId!, issueId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.detail(documentId!) }),
  });

  const unlinkIssue = useMutation({
    mutationFn: (issueId: string) => documentsApi.unlinkIssue(documentId!, issueId),
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

  const linkedGoalIds = new Set(doc.goals?.map((g) => g.goalId) ?? []);
  const linkedIssueIds = new Set(doc.issues?.map((i) => i.issueId) ?? []);
  const unlinkedGoals = (allGoals ?? []).filter((g) => !linkedGoalIds.has(g.id));

  return (
    <div className="space-y-6">
      {/* Title */}
      <InlineEditor
        value={doc.title}
        onSave={(title) => updateDoc.mutate({ title })}
        className="text-2xl font-bold"
      />

      {/* Metadata bar */}
      <div className="flex flex-wrap gap-4 text-sm">
        {/* Project selector */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Project:</span>
          <select
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            value={doc.projectId ?? ""}
            onChange={(e) =>
              updateDoc.mutate({ projectId: e.target.value || null })
            }
          >
            <option value="">None</option>
            {(projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {saving && <span className="text-xs text-muted-foreground">Saving...</span>}
      </div>

      {/* Linked Goals */}
      <div>
        <h3 className="text-xs font-medium uppercase text-muted-foreground mb-2">
          Linked Goals
        </h3>
        <div className="flex flex-wrap gap-2 mb-2">
          {doc.goals?.map((link) => {
            const goal = (allGoals ?? []).find((g) => g.id === link.goalId);
            return (
              <span
                key={link.goalId}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
              >
                {goal?.title ?? link.goalId}
                <button onClick={() => unlinkGoal.mutate(link.goalId)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
        {unlinkedGoals.length > 0 && (
          <select
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            value=""
            onChange={(e) => {
              if (e.target.value) linkGoal.mutate(e.target.value);
            }}
          >
            <option value="">+ Link goal...</option>
            {unlinkedGoals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Linked Issues */}
      <div>
        <h3 className="text-xs font-medium uppercase text-muted-foreground mb-2">
          Linked Issues
        </h3>
        <div className="flex flex-wrap gap-2 mb-2">
          {doc.issues?.map((link) => (
            <span
              key={link.issueId}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
            >
              {link.issueId.slice(0, 8)}...
              <button onClick={() => unlinkIssue.mutate(link.issueId)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Editor */}
      <DocumentEditor
        initialContent={doc.content as Record<string, unknown>}
        onUpdate={handleContentUpdate}
      />
    </div>
  );
}
