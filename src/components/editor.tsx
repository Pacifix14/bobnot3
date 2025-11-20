"use client";
"use client";

import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNoteWithLiveblocks } from "@liveblocks/react-blocknote";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";

// Import BlockNote styles
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

function BlockNoteEditorInner({ 
  pageId, 
  title: initialTitle 
}: { 
  pageId: string, 
  title: string 
}) {
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Create BlockNote editor with Liveblocks collaboration
  const editor = useCreateBlockNoteWithLiveblocks({
    // Don't pass initialContent - Liveblocks manages the document state
  });

  // Debounced save to database
  const saveToDatabase = useCallback(async (content: any, currentTitle: string) => {
    setStatus("saving");
    try {
      await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content, 
          title: currentTitle 
        }),
      });
      setStatus("saved");
    } catch (error) {
      console.error("Failed to save", error);
      setStatus("unsaved");
    }
  }, [pageId]);

  // Listen for editor changes
  useEffect(() => {
    if (!editor) return;

    const handleChange = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      setStatus("unsaved");
      saveTimeoutRef.current = setTimeout(() => {
        saveToDatabase(editor.document, title);
      }, 1000);
    };

    editor.onChange(handleChange);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [editor, saveToDatabase, title]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setStatus("unsaved");
    saveTimeoutRef.current = setTimeout(() => {
      if (editor) {
        saveToDatabase(editor.document, newTitle);
      }
    }, 1000);
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 relative">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Input 
            value={title} 
            onChange={handleTitleChange}
            className="text-4xl font-serif font-medium border-none px-0 shadow-none focus-visible:ring-0 h-auto placeholder:text-muted-foreground/50 bg-transparent"
            placeholder="Untitled"
          />
        </div>
        <div className="text-xs text-muted-foreground w-20 text-right">
          {status === "saving" && <span className="flex items-center justify-end gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saving</span>}
          {status === "saved" && "Saved"}
          {status === "unsaved" && "Unsaved"}
        </div>
      </div>
      <BlockNoteView editor={editor} theme="light" />
    </div>
  );
}

export function Editor({ 
  pageId, 
  title 
}: { 
  pageId: string, 
  title: string 
}) {
  return (
    <RoomProvider id={`page-${pageId}`} initialPresence={{}}>
      <ClientSideSuspense fallback={<div>Loading...</div>}>
        {() => (
          <BlockNoteEditorInner 
            pageId={pageId}
            title={title}
          />
        )}
      </ClientSideSuspense>
    </RoomProvider>
  );
}
