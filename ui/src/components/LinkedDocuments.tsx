import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { documentsApi } from "../api/documents";
import { queryKeys } from "../lib/queryKeys";
import { FileText } from "lucide-react";
import type { Document } from "@paperclipai/shared";

interface LinkedDocumentsProps {
  companyId: string;
  goalId?: string;
  issueId?: string;
}

export function LinkedDocuments({ companyId, goalId, issueId }: LinkedDocumentsProps) {
  const navigate = useNavigate();

  const queryKey = goalId
    ? queryKeys.documents.byGoal(goalId)
    : queryKeys.documents.byIssue(issueId!);

  const { data: documents } = useQuery({
    queryKey,
    queryFn: () =>
      documentsApi.list(companyId, goalId ? { goalId } : { issueId }),
    enabled: !!(goalId || issueId),
  });

  if (!documents || documents.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-xs font-medium uppercase text-muted-foreground mb-2">
        Linked Documents
      </h3>
      <div className="space-y-1">
        {documents.map((doc) => (
          <button
            key={doc.id}
            onClick={() => navigate(`/documents/${doc.id}`)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm hover:bg-accent/50 transition-colors"
          >
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{doc.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
