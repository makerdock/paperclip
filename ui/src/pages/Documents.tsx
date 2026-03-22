import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { documentsApi } from "../api/documents";
import { projectsApi } from "../api/projects";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import type { Document, Project } from "@paperclipai/shared";

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function GroupedDocuments({
  documents,
  projects,
  onDocClick,
}: {
  documents: Document[];
  projects: Project[];
  onDocClick: (id: string) => void;
}) {
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const grouped = new Map<string | null, Document[]>();
  for (const doc of documents) {
    const key = doc.projectId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(doc);
  }

  const sortedGroups = Array.from(grouped.entries()).sort(([a], [b]) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {sortedGroups.map(([projectId, docs]) => {
        const project = projectId ? projectMap.get(projectId) : null;
        return (
          <div key={projectId ?? "unassigned"}>
            <h3 className="text-xs font-medium uppercase text-muted-foreground mb-2">
              {project ? project.name : "No Project"}
            </h3>
            <div className="space-y-1">
              {docs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onDocClick(doc.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-accent/50 transition-colors"
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDate(doc.updatedAt)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Documents() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();

  useEffect(() => {
    setBreadcrumbs([{ label: "Documents" }]);
  }, [setBreadcrumbs]);

  const { data: documents, isLoading, error } = useQuery({
    queryKey: queryKeys.documents.list(selectedCompanyId!),
    queryFn: () => documentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const handleNew = async () => {
    if (!selectedCompanyId) return;
    const doc = await documentsApi.create(selectedCompanyId, { title: "Untitled" });
    navigate(`/documents/${doc.id}`);
  };

  if (!selectedCompanyId) {
    return <EmptyState icon={FileText} message="Select a company to view documents." />;
  }

  if (isLoading) {
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {documents && documents.length === 0 && (
        <EmptyState
          icon={FileText}
          message="No documents yet."
          action="New Document"
          onAction={handleNew}
        />
      )}

      {documents && documents.length > 0 && (
        <>
          <div className="flex items-center justify-start">
            <Button size="sm" variant="outline" onClick={handleNew}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Document
            </Button>
          </div>
          <GroupedDocuments
            documents={documents}
            projects={projects ?? []}
            onDocClick={(id) => navigate(`/documents/${id}`)}
          />
        </>
      )}
    </div>
  );
}
