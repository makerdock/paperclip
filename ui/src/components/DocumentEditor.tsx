import { useCallback, useRef } from "react";
import {
  EditorRoot,
  EditorContent,
  type JSONContent,
} from "novel";

interface DocumentEditorProps {
  initialContent?: Record<string, unknown>;
  onUpdate?: (content: JSONContent) => void;
}

export function DocumentEditor({ initialContent, onUpdate }: DocumentEditorProps) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUpdate = useCallback(
    ({ editor }: { editor: { getJSON: () => JSONContent } }) => {
      if (!onUpdate) return;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        onUpdate(editor.getJSON());
      }, 500);
    },
    [onUpdate],
  );

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <EditorRoot>
        <EditorContent
          initialContent={initialContent as JSONContent | undefined}
          onUpdate={handleUpdate}
          editorProps={{
            attributes: {
              class:
                "min-h-[300px] rounded-md border border-border bg-background p-4 focus:outline-none",
            },
          }}
        />
      </EditorRoot>
    </div>
  );
}
