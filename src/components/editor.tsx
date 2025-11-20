"use client";

import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNoteWithLiveblocks } from "@liveblocks/react-blocknote";
import { useCallback, useEffect, useRef, useState, useMemo, memo } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";

// Import BlockNote styles
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

// Memoized Editor Component to prevent re-renders
const BlockNoteEditor = memo(function BlockNoteEditor({ 
  pageId, 
  onStatusChange 
}: { 
  pageId: string, 
  onStatusChange: (status: "saved" | "saving" | "unsaved") => void 
}) {
  // Create BlockNote editor with Liveblocks collaboration
  // The options object must be stable to prevent editor recreation
  const editorOptions = useMemo(() => ({
    // Don't pass initialContent - Liveblocks manages the document state
  }), []);
  
  const editor = useCreateBlockNoteWithLiveblocks(editorOptions);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveToDatabase = useCallback(async (content: any) => {
    onStatusChange("saving");
    try {
      await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      onStatusChange("saved");
    } catch (error) {
      console.error("Failed to save content", error);
      onStatusChange("unsaved");
    }
  }, [pageId, onStatusChange]);

  // Handle editor changes
  useEffect(() => {
    if (!editor) return;

    const handleChange = () => {
      onStatusChange("unsaved");
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveToDatabase(editor.document);
      }, 1000);
    };

    // Subscribe to updates
    const unsubscribe = editor.onChange(handleChange);
    return () => {
      unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [editor, saveToDatabase, onStatusChange]);

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <BlockNoteView 
      editor={editor} 
      theme="light" 
    />
  );
});

function BlockNoteEditorInner({ 
  pageId, 
  title: initialTitle 
}: { 
  pageId: string, 
  title: string 
}) {
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTitleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Stable callback for status updates
  const handleStatusChange = useCallback((newStatus: "saved" | "saving" | "unsaved") => {
    setStatus(newStatus);
  }, []);

  const saveTitle = useCallback(async (newTitle: string) => {
    setStatus("saving");
    try {
      await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      setStatus("saved");
    } catch (error) {
      console.error("Failed to save title", error);
      setStatus("unsaved");
    }
  }, [pageId]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setStatus("unsaved");
    
    if (saveTitleTimeoutRef.current) {
      clearTimeout(saveTitleTimeoutRef.current);
    }
    saveTitleTimeoutRef.current = setTimeout(() => {
      saveTitle(newTitle);
    }, 1000);
  };

  // Cleanup title timeout
  useEffect(() => {
    return () => {
      if (saveTitleTimeoutRef.current) {
        clearTimeout(saveTitleTimeoutRef.current);
      }
    };
  }, []);

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
      <BlockNoteEditor pageId={pageId} onStatusChange={handleStatusChange} />
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
