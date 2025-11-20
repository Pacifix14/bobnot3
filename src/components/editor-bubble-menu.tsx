"use client";

import { useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/core";
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  CodeIcon,
  LinkIcon,
  HighlighterIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface EditorBubbleMenuProps {
  editor: Editor;
}

export const EditorBubbleMenu = ({ editor }: EditorBubbleMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateMenu = () => {
      const { state } = editor;
      const { selection } = state;
      const { empty } = selection;

      // Hide if selection is empty
      if (empty) {
        setIsVisible(false);
        return;
      }

      // Hide if in code block or image
      if (editor.isActive("codeBlock") || editor.isActive("image")) {
        setIsVisible(false);
        return;
      }

      setIsVisible(true);

      // Position the menu
      if (menuRef.current) {
        const { from, to } = selection;
        const start = editor.view.coordsAtPos(from);
        const end = editor.view.coordsAtPos(to);
        
        const editorRect = editor.view.dom.getBoundingClientRect();
        const menuRect = menuRef.current.getBoundingClientRect();

        const left = Math.max(
          0,
          Math.min(
            (start.left + end.left) / 2 - menuRect.width / 2,
            window.innerWidth - menuRect.width - 10
          )
        );

        const top = start.top - menuRect.height - 10;

        menuRef.current.style.left = `${left}px`;
        menuRef.current.style.top = `${top}px`;
      }
    };

    editor.on("selectionUpdate", updateMenu);
    editor.on("transaction", updateMenu);

    return () => {
      editor.off("selectionUpdate", updateMenu);
      editor.off("transaction", updateMenu);
    };
  }, [editor]);

  if (!isVisible) {
    return null;
  }

  const items = [
    {
      name: "bold",
      icon: BoldIcon,
      command: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive("bold"),
    },
    {
      name: "italic",
      icon: ItalicIcon,
      command: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive("italic"),
    },
    {
      name: "underline",
      icon: UnderlineIcon,
      command: () => editor.chain().focus().toggleUnderline().run(),
      isActive: editor.isActive("underline"),
    },
    {
      name: "strike",
      icon: StrikethroughIcon,
      command: () => editor.chain().focus().toggleStrike().run(),
      isActive: editor.isActive("strike"),
    },
    {
      name: "code",
      icon: CodeIcon,
      command: () => editor.chain().focus().toggleCode().run(),
      isActive: editor.isActive("code"),
    },
    {
      name: "link",
      icon: LinkIcon,
      command: () => {
        const previousUrl = editor.getAttributes("link").href;
        const url = window.prompt("URL", previousUrl);
        if (url === null) return;
        if (url === "") {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
          return;
        }
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      },
      isActive: editor.isActive("link"),
    },
    {
      name: "highlight",
      icon: HighlighterIcon,
      command: () => editor.chain().focus().toggleHighlight().run(),
      isActive: editor.isActive("highlight"),
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 flex divide-x divide-stone-200 rounded-lg border border-stone-200 bg-white shadow-xl dark:divide-stone-700 dark:border-stone-700 dark:bg-stone-900"
      style={{ pointerEvents: "auto" }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={item.command}
          className={cn(
            "p-2 text-stone-600 hover:bg-stone-100 active:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-800 dark:active:bg-stone-700 first:rounded-l-lg last:rounded-r-lg",
            item.isActive && "bg-stone-100 text-blue-600 dark:bg-stone-800 dark:text-blue-400"
          )}
          type="button"
        >
          <item.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
};
