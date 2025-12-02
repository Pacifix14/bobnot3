"use client";

import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNoteWithLiveblocks } from "@liveblocks/react-blocknote";
import { useIsEditorReady } from "@liveblocks/react-blocknote";
import { useCallback, useEffect, useRef, useState, useMemo, memo } from "react";
import { useTheme } from "next-themes";
import { useToast } from "@/components/toast-provider";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";
import { LiveblocksProvider } from "@liveblocks/react/suspense";
import type { Block } from "@blocknote/core";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareDialog } from "@/components/share-dialog";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";

// Dynamically import BlockNote styles to avoid blocking lazy load
// This ensures CSS only loads when the editor component is actually used
import "./editor-styles";

// Memoized Editor Component to prevent re-renders
const BlockNoteEditor = memo(function BlockNoteEditor({ 
  pageId, 
  onStatusChange 
}: { 
  pageId: string, 
  onStatusChange: (status: "saved" | "saving" | "unsaved") => void 
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const { showToast } = useToast();
  
  // Create BlockNote editor with Liveblocks collaboration
  // The options object must be stable to prevent editor recreation
  const editorOptions = useMemo(() => ({
    // Don't pass initialContent - Liveblocks manages the document state
  }), []);
  
  const editor = useCreateBlockNoteWithLiveblocks(editorOptions);
  const isReady = useIsEditorReady();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveToDatabase = useCallback(async (content: Block[]) => {
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

  // Track toggle list content to prevent it from moving when Enter is pressed
  const toggleListContentRef = useRef<{ blockId: string; content: unknown } | null>(null);

  // Handle editor changes
  useEffect(() => {
    if (!editor) return;

    const handleChange = () => {
      // Check if we need to fix toggle list content movement
      if (toggleListContentRef.current) {
        const { blockId, content: originalContent } = toggleListContentRef.current;
        const currentBlock = editor.getBlock(blockId);
        
        if (currentBlock && currentBlock.type === 'toggleListItem') {
          const currentContentStr = JSON.stringify(currentBlock.content || []);
          const originalContentStr = JSON.stringify(originalContent);
          
          // If content was moved (original block is now empty), restore it
          if (currentContentStr !== originalContentStr && 
              (currentContentStr === '[]' || currentContentStr === 'null' || currentContentStr === '""')) {
            setTimeout(() => {
              try {
                editor.updateBlock(blockId, {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
                  content: originalContent as any,
                });
                toggleListContentRef.current = null;
              } catch (error) {
                console.error('Error restoring toggle list content:', error);
                toggleListContentRef.current = null;
              }
            }, 0);
          } else {
            // Content is still there, clear the ref
            toggleListContentRef.current = null;
          }
        } else {
          toggleListContentRef.current = null;
        }
      }
      
      onStatusChange("unsaved");
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        void saveToDatabase(editor.document);
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

  // Fix toggle list Enter key behavior - prevent content from moving to new list item
  useEffect(() => {
    if (!editor || !isReady) return;

    const handleEnterKey = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      
      if (keyboardEvent.key !== 'Enter' || keyboardEvent.shiftKey) return;
      
      try {
        if (!editor?.isEditable) return;

        const textCursorPosition = editor.getTextCursorPosition();
        const currentBlock = textCursorPosition.block;
        
        // Check if we're in a toggle list
        if (currentBlock?.type === 'toggleListItem') {
          // Get the current block content before Enter is processed
          const blockBeforeEnter = editor.getBlock(currentBlock.id);
          if (!blockBeforeEnter) return;
          
          // Check if block has content by converting to string
          const contentStr = JSON.stringify(blockBeforeEnter.content);
          const hasContent = contentStr && contentStr !== '[]' && contentStr !== 'null' && contentStr !== '""';
          
          if (hasContent) {
            // Prevent BlockNote's default Enter behavior completely
            keyboardEvent.preventDefault();
            keyboardEvent.stopPropagation();
            keyboardEvent.stopImmediatePropagation();
            
            // Store the original content
            const originalContent = JSON.parse(JSON.stringify(blockBeforeEnter.content)) as Block['content'];
            
            // Store in ref for onChange handler as backup
            toggleListContentRef.current = {
              blockId: currentBlock.id,
              content: originalContent,
            };
            
            // Manually insert a new empty toggle list item
            try {
              void editor.insertBlocks(
                [{
                  type: 'toggleListItem',
                  content: [],
                }],
                currentBlock.id,
                'after'
              );
              
              // Small delay to ensure the insert completed
              setTimeout(() => {
                // Verify original block still has content, restore if needed
                const blockAfterInsert = editor.getBlock(currentBlock.id);
                if (blockAfterInsert) {
                  const contentAfterStr = JSON.stringify(blockAfterInsert.content ?? []);
                  const originalContentStr = JSON.stringify(originalContent);
                  
                  if (contentAfterStr !== originalContentStr && 
                      (contentAfterStr === '[]' || contentAfterStr === 'null' || contentAfterStr === '""')) {
                    // Content was moved, restore it
                    editor.updateBlock(currentBlock.id, {
                      content: originalContent,
                    });
                  }
                }
              }, 10);
              
              // Find and move cursor to the new toggle list item
              setTimeout(() => {
                try {
                  const document = editor.document;
                  const findNextToggle = (blocks: Block[], targetId: string): Block | null => {
                    for (let i = 0; i < blocks.length; i++) {
                      const block = blocks[i];
                      if (!block) continue;
                      
                      if (block.id === targetId) {
                        // Found the target, return the next sibling if it's a toggle list
                        if (i + 1 < blocks.length) {
                          const nextBlock = blocks[i + 1];
                          if (nextBlock && nextBlock.type === 'toggleListItem') {
                            return nextBlock;
                          }
                        }
                        return null;
                      }
                      if (block.children) {
                        const found = findNextToggle(block.children, targetId);
                        if (found) return found;
                      }
                    }
                    return null;
                  };
                  
                  const nextToggle = findNextToggle(document, currentBlock.id);
                  if (nextToggle) {
                    editor.setTextCursorPosition(nextToggle.id, 'start');
                  }
                  toggleListContentRef.current = null;
                } catch (error) {
                  console.error('Error moving cursor:', error);
                  toggleListContentRef.current = null;
                }
              }, 20);
              
            } catch (error) {
              console.error('Error inserting new toggle list item:', error);
              toggleListContentRef.current = null;
            }
            
            return false;
          }
        }
      } catch (error) {
        console.error('Error handling toggle list Enter key:', error);
      }
    };

    // Add event listener with highest priority to catch Enter before BlockNote processes it
    const editorElement = document.querySelector('[data-id="blocknote-editor"]');
    const proseMirrorElement = editorElement?.querySelector('.ProseMirror');
    
    // Add to multiple elements to ensure we catch it
    if (proseMirrorElement) {
      proseMirrorElement.addEventListener('keydown', handleEnterKey as (e: Event) => void, { capture: true, passive: false });
    }
    if (editorElement) {
      editorElement.addEventListener('keydown', handleEnterKey as (e: Event) => void, { capture: true, passive: false });
    }
    document.addEventListener('keydown', handleEnterKey as (e: Event) => void, { capture: true, passive: false });
    
    return () => {
      if (proseMirrorElement) {
        proseMirrorElement.removeEventListener('keydown', handleEnterKey as (e: Event) => void, { capture: true });
      }
      if (editorElement) {
        editorElement.removeEventListener('keydown', handleEnterKey as (e: Event) => void, { capture: true });
      }
      document.removeEventListener('keydown', handleEnterKey as (e: Event) => void, { capture: true });
    };
  }, [editor, isReady]);

  // Enable bulk indentation for multiple selected bullet points
  useEffect(() => {
    if (!editor || !isReady) return;

    const handleKeyDown = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      
      if (keyboardEvent.key === 'Tab') {
        try {
          if (!editor?.isEditable) return;

          const selection = editor.getSelection();
          
          if (selection?.blocks && selection.blocks.length > 1) {
            const listBlocks = selection.blocks.filter(block => 
              block.type === 'bulletListItem' || block.type === 'numberedListItem' || block.type === 'checkListItem'
            );
            
            if (listBlocks.length > 0) {
              // Prevent toolbar from capturing Tab key
              keyboardEvent.preventDefault();
              keyboardEvent.stopPropagation();
              keyboardEvent.stopImmediatePropagation();
              
              setTimeout(() => {
                try {
                  if (!editor?.isEditable) return;

                  const processBlocks = async (blocks: typeof listBlocks, isOutdent: boolean) => {
                    for (const block of blocks) {
                      try {
                        await new Promise(resolve => setTimeout(resolve, 5));
                        
                        if (editor?.isEditable) {
                          editor.focus();
                          editor.setTextCursorPosition(block.id, "end");
                          await new Promise(resolve => setTimeout(resolve, 5));
                          
                          if (isOutdent) {
                            editor.unnestBlock();
                          } else {
                            editor.nestBlock();
                          }
                        }
                      } catch (error) {
                        console.error(`Error ${isOutdent ? 'outdenting' : 'indenting'} block:`, error);
                      }
                    }
                  };

                  void processBlocks(listBlocks, keyboardEvent.shiftKey);
                } catch (error) {
                  console.error('Error in bulk indentation:', error);
                }
              }, 0);
              
              return false;
            }
          }
        } catch (error) {
          console.error('Error handling bulk indentation:', error);
        }
      }
    };

    // Capture Tab events before toolbar can intercept them
    document.addEventListener('keydown', handleKeyDown, true);
    
    const editorElement = document.querySelector('[data-id="blocknote-editor"]');
    if (editorElement) {
      editorElement.addEventListener('keydown', handleKeyDown, true);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (editorElement) {
        editorElement.removeEventListener('keydown', handleKeyDown, true);
      }
    };
  }, [editor, isReady]);

  // Hide toolbar when multiple list items are selected to prevent Tab interference
  useEffect(() => {
    if (!editor || !isReady) return;

    const handleSelectionChange = () => {
      try {
        if (!editor?.isEditable) return;

        const selection = editor.getSelection();
        const hasMultipleListItems = selection?.blocks && 
          selection.blocks.length > 1 &&
          selection.blocks.some(block => 
            block.type === 'bulletListItem' || block.type === 'numberedListItem' || block.type === 'checkListItem'
          );

        setTimeout(() => {
          const toolbar = document.querySelector('.bn-formatting-toolbar, .bn-selection-toolbar, [data-test="formatting-toolbar"]');
          if (toolbar) {
            (toolbar as HTMLElement).style.display = hasMultipleListItems ? 'none' : '';
          }
        }, 10);
      } catch (error) {
        console.error('Error handling selection change:', error);
      }
    };

    let unsubscribe: (() => void) | null = null;
    
    try {
      unsubscribe = editor.onSelectionChange(handleSelectionChange);
    } catch (error) {
      console.error('Error setting up selection change listener:', error);
    }
    
    return () => {
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error cleaning up selection change listener:', error);
        }
      }
      
      setTimeout(() => {
        const toolbar = document.querySelector('.bn-formatting-toolbar, .bn-selection-toolbar, [data-test="formatting-toolbar"]');
        if (toolbar) {
          (toolbar as HTMLElement).style.display = '';
        }
      }, 10);
    };
  }, [editor, isReady]);

  // Fix checkbox cursor positioning for "[] " markdown syntax
  useEffect(() => {
    if (!editor || !isReady) return;

    // Add a small delay to ensure DOM is ready
    const setupTimeout = setTimeout(() => {
      setupEventListeners();
    }, 100);

    const handleKeyDown = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      
      // Only handle space key
      if (keyboardEvent.key !== ' ') return;
      
      try {
        if (!editor?.isEditable) return;
        
        const currentBlock = editor.getTextCursorPosition().block;
        if (!currentBlock || currentBlock.type !== 'paragraph') return;
        
        // Get the current text content
        const blockContent = currentBlock.content;
        if (!Array.isArray(blockContent) || blockContent.length === 0) return;
        
        // Get the full text content
        const textContent = blockContent.map(item => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && 'text' in item) return (item as { text?: string }).text ?? '';
          return '';
        }).join('');
        
        // Check if the text starts with "[]" or "[] " (with or without space)
        const checkboxRegex = /^\[\]\s*(.*)$/;
        const checkboxMatch = checkboxRegex.exec(textContent);
        const isExactCheckbox = textContent === '[]';
        
        if (checkboxMatch || isExactCheckbox) {
          // Prevent ALL default behaviors more aggressively
          keyboardEvent.preventDefault();
          keyboardEvent.stopPropagation();
          keyboardEvent.stopImmediatePropagation();
          
          // Immediately convert without any delay to prevent flicker
          try {
            if (!editor?.isEditable) return;
            
            // Extract content after "[]" or "[] " from the original blockContent
            let remainingContent: Block['content'] = [];
            
            if (checkboxMatch?.[1]?.trim()) {
              // There's content after "[] ", preserve it by extracting from blockContent
              // We need to find where "[]" ends in the content array and keep everything after
              
              // Iterate through blockContent to find where "[]" or "[] " ends
              for (let i = 0; i < blockContent.length; i++) {
                const item = blockContent[i];
                const itemText = typeof item === 'string' ? item : 
                  (typeof item === 'object' && 'text' in item ? (item as { text?: string }).text ?? '' : '');
                
                if (!itemText) continue;
                
                // Check if this item contains "[]" or "[] "
                const bracketIndex = itemText.indexOf('[]');
                if (bracketIndex !== -1) {
                  // Check if there's a space after "[]"
                  const afterBracket = itemText.substring(bracketIndex + 2);
                  if (afterBracket.startsWith(' ') || afterBracket.startsWith('\u00A0')) {
                    const afterSpace = afterBracket.substring(1);
                    
                    if (afterSpace) {
                      // There's content in this same item after "[] "
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                      if (typeof item === 'string') {
                        remainingContent.push(afterSpace as never);
                      } else {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                        remainingContent.push({ ...item, text: afterSpace } as never);
                      }
                    }
                    // Add all remaining items
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                    remainingContent.push(...(blockContent.slice(i + 1) as never[]));
                    break;
                  } else if (afterBracket) {
                    // There's content after "[]" but no space
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                    if (typeof item === 'string') {
                      remainingContent.push(afterBracket as never);
                    } else {
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                      remainingContent.push({ ...item, text: afterBracket } as never);
                    }
                    // Add all remaining items
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                    remainingContent.push(...(blockContent.slice(i + 1) as never[]));
                    break;
                  } else {
                    // "[]" is at the end of this item, content starts in next items
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                    remainingContent.push(...(blockContent.slice(i + 1) as never[]));
                    break;
                  }
                }
              }
              
              // If we couldn't parse it from structure, use the regex match as fallback
              if (Array.isArray(remainingContent) && remainingContent.length === 0 && checkboxMatch[1]) {
                // Create content from the remaining text - BlockNote format
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                remainingContent = blockContent.filter((item) => {
                  // Skip items that are part of "[]"
                  const itemText = typeof item === 'string' ? item : 
                    (typeof item === 'object' && 'text' in item ? (item as { text?: string }).text ?? '' : '');
                  return itemText && !itemText.includes('[]');
                }) as Block['content'];
                
                // If still empty, create a simple text content
                if (Array.isArray(remainingContent) && remainingContent.length === 0) {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                  remainingContent = [{ type: 'text', text: checkboxMatch[1] }] as Block['content'];
                }
              }
            }
            
            // Update the block to be a checkListItem with preserved content
            editor.updateBlock(currentBlock.id, {
              type: 'checkListItem',
              props: { checked: false },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
              content: remainingContent as any
            });
            
            // Position cursor at the end of the checkbox content (or start if empty)
            setTimeout(() => {
              try {
                if (Array.isArray(remainingContent) && remainingContent.length > 0) {
                  editor.setTextCursorPosition(currentBlock.id, "end");
                } else {
                  editor.setTextCursorPosition(currentBlock.id, "start");
                }
              } catch {
                // Fallback: just set to start to keep cursor in same block
                editor.setTextCursorPosition(currentBlock.id, "start");
              }
            }, 0);
            
          } catch (error) {
            console.error('Error manually creating checkbox:', error);
          }
        }
      } catch (error) {
        console.error('Error in checkbox keydown handler:', error);
      }
    };

    const setupEventListeners = () => {
      // Add event listener to capture space key
      const editorElement = document.querySelector('[data-id="blocknote-editor"]');
      
      if (editorElement) {
        // Use capture phase with highest priority
        editorElement.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
        
        // Try adding to the ProseMirror editor specifically with highest priority
        const proseMirrorElement = editorElement.querySelector('.ProseMirror');
        if (proseMirrorElement) {
          proseMirrorElement.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
        }
      }
      
      // Always add to document as backup with highest priority
      document.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    };
    
    // Try immediate setup
    setupEventListeners();

    return () => {
      clearTimeout(setupTimeout);
      
      const editorElement = document.querySelector('[data-id="blocknote-editor"]');
      if (editorElement) {
        editorElement.removeEventListener('keydown', handleKeyDown, { capture: true });
        const proseMirrorElement = editorElement.querySelector('.ProseMirror');
        if (proseMirrorElement) {
          proseMirrorElement.removeEventListener('keydown', handleKeyDown, { capture: true });
        }
      }
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [editor, isReady]);

  // Add copy functionality for code blocks
  useEffect(() => {
    const handleCopyClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const codeBlock = target.closest('[data-content-type="codeBlock"]');
      
      if (!codeBlock) return;
      
      // Check if click is in the copy button area (right side of header)
      const rect = codeBlock.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;
      
      // Copy button area: right 60px, top 44px (header height)
      if (clickX >= rect.width - 60 && clickX <= rect.width - 20 && clickY >= 8 && clickY <= 36) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        // Store current scroll position to prevent page jump
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;
        
        // Prevent any focus changes that might cause scrolling
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement?.blur) {
          activeElement.blur();
        }
        
        // Get the code content
        const preElement = codeBlock.querySelector('pre');
        const codeContent = preElement?.textContent ?? '';
        
        // Handle async clipboard operation
        void (async () => {
          try {
            await navigator.clipboard.writeText(codeContent);
            
            // Restore scroll position immediately after copy
            window.scrollTo({
              left: scrollX,
              top: scrollY,
              behavior: 'instant'
            });
            
            // Show success toast
            showToast("Code copied to clipboard!", "success");
            
            // Ensure scroll position is maintained (sometimes needed after async operations)
            requestAnimationFrame(() => {
              window.scrollTo({
                left: scrollX,
                top: scrollY,
                behavior: 'instant'
              });
            });
            
            // One more check after a short delay to ensure position is maintained
            setTimeout(() => {
              if (window.scrollY !== scrollY || window.scrollX !== scrollX) {
                window.scrollTo({
                  left: scrollX,
                  top: scrollY,
                  behavior: 'instant'
                });
              }
            }, 10);
          } catch (err) {
            console.error('Failed to copy code:', err);
            showToast("Failed to copy code", "error");
            // Restore scroll position even on error
            window.scrollTo({
              left: scrollX,
              top: scrollY,
              behavior: 'instant'
            });
          }
        })();
        
        return false;
      }
    };

    // Add event listener to the document to catch all clicks
    document.addEventListener('click', handleCopyClick, true); // Use capture phase
    
    return () => {
      document.removeEventListener('click', handleCopyClick, true);
    };
  }, [showToast]);

  // Add action buttons to code blocks using CSS approach
  useEffect(() => {
    if (!editor) return;

    // Add dynamic styling for code block buttons
    const styleElement = document.createElement('style');
    styleElement.id = 'code-block-buttons-style';
    styleElement.textContent = `
      .bn-editor [data-content-type="codeBlock"] {
        position: relative;
      }
      
      .bn-editor [data-content-type="codeBlock"]::after {
        content: "";
        position: absolute;
        top: 0.75rem;
        right: 1rem;
        width: 4rem;
        height: 1.25rem;
        background: 
          url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpath d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/%3e%3crect width='8' height='4' x='8' y='2' rx='1' ry='1'/%3e%3c/svg%3e") no-repeat right center,
          url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ccc' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cline x1='3' y1='6' x2='21' y2='6'/%3e%3cline x1='3' y1='12' x2='21' y2='12'/%3e%3cline x1='3' y1='18' x2='21' y2='18'/%3e%3c/svg%3e") no-repeat center center,
          url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ccc' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpath d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/%3e%3cpolyline points='7,10 12,15 17,10'/%3e%3cline x1='12' y1='15' x2='12' y2='3'/%3e%3c/svg%3e") no-repeat left center;
        background-size: 16px 16px, 16px 16px, 16px 16px;
        cursor: pointer;
        opacity: 0.8;
        transition: all 0.2s ease;
        z-index: 10;
      }
      
      .bn-editor [data-content-type="codeBlock"]:hover::after {
        opacity: 1;
        background: 
          url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3e%3cpath d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/%3e%3crect width='8' height='4' x='8' y='2' rx='1' ry='1'/%3e%3c/svg%3e") no-repeat right center,
          url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ccc' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cline x1='3' y1='6' x2='21' y2='6'/%3e%3cline x1='3' y1='12' x2='21' y2='12'/%3e%3cline x1='3' y1='18' x2='21' y2='18'/%3e%3c/svg%3e") no-repeat center center,
          url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ccc' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpath d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/%3e%3cpolyline points='7,10 12,15 17,10'/%3e%3cline x1='12' y1='15' x2='12' y2='3'/%3e%3c/svg%3e") no-repeat left center;
        background-size: 16px 16px, 16px 16px, 16px 16px;
      }
    `;
    
    // Add the style to the document head
    if (!document.getElementById('code-block-buttons-style')) {
      document.head.appendChild(styleElement);
    }
    
    return () => {
      // Clean up the style element
      const existingStyle = document.getElementById('code-block-buttons-style');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [editor]);

  // Wait for both editor and Liveblocks to be ready
  // The optimizations we made (deferred LiveblocksProvider, optimized auth) 
  // should make this much faster
  if (!editor || !isReady) {
    return (
      <div className="pl-[54px] pr-6 space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  return (
    <BlockNoteView 
      editor={editor} 
      theme={mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light"} 
    />
  );
});

function EditorSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 relative">
      <div className="pl-[54px] pr-6">
        <Skeleton className="h-12 w-1/2" />
      </div>
      <div className="pl-[54px] pr-6 space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

function BlockNoteEditorInner({ 
  pageId, 
  title: initialTitle 
}: { 
  pageId: string, 
  title: string 
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const isMobile = useIsMobile();
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTitleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Stable callback for status updates
  const handleStatusChange = useCallback((newStatus: "saved" | "saving" | "unsaved") => {
    setStatus(newStatus);
  }, []);

  const updateTitle = api.page.updateTitle.useMutation({
    onMutate: () => {
      setStatus("saving");
    },
    onSuccess: () => {
      setStatus("saved");
      // Invalidate page cache to update breadcrumbs
      void utils.page.getPage.invalidate({ pageId });
      // Invalidate workspace cache to update sidebar
      void utils.workspace.getWorkspace.invalidate();
      // Refresh server-side data to update sidebar immediately
      router.refresh();
    },
    onError: (error) => {
      console.error("Failed to save title", error);
      setStatus("unsaved");
    }
  });

  const saveTitle = useCallback(async (newTitle: string) => {
    updateTitle.mutate({ pageId, title: newTitle });
  }, [pageId, updateTitle]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setStatus("unsaved");
    
    if (saveTitleTimeoutRef.current) {
      clearTimeout(saveTitleTimeoutRef.current);
    }
    saveTitleTimeoutRef.current = setTimeout(() => {
      void saveTitle(newTitle);
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
    <div className="max-w-5xl mx-auto space-y-3 md:space-y-4 relative overflow-hidden">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 pl-0 md:pl-[54px] pr-4 md:pr-6">
        <div className="flex-1 min-w-0 w-full md:w-auto">
          <Input
            value={title}
            onChange={handleTitleChange}
            className="font-serif font-medium border-none px-0 shadow-none focus-visible:ring-0 h-auto placeholder:text-muted-foreground/50 bg-transparent w-full"
            placeholder="Untitled"
            style={{ fontSize: isMobile ? '1.25rem' : '2rem' }}
          />
        </div>
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 w-full md:w-auto justify-between md:justify-end">
            <ShareDialog pageId={pageId} />
            <div className="text-xs text-muted-foreground w-auto md:w-20 text-right">
            {status === "saving" && <span className="flex items-center justify-end gap-1"><Loader2 className="h-3 w-3 animate-spin" /> <span className="hidden md:inline">Saving</span></span>}
            {status === "saved" && <span className="hidden md:inline">Saved</span>}
            {status === "unsaved" && <span className="hidden md:inline">Unsaved</span>}
            </div>
        </div>
      </div>
      <div className="overflow-hidden">
        <BlockNoteEditor pageId={pageId} onStatusChange={handleStatusChange} />
      </div>
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
  // Only initialize Liveblocks when editor is actually rendered
  // This defers the connection until the component is mounted
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      // Optimized throttle - 16ms provides smooth 60fps updates
      // This is already optimal for most use cases
      throttle={16}
    >
      <RoomProvider id={`page-${pageId}`} initialPresence={{}}>
        <ClientSideSuspense fallback={<EditorSkeleton />}>
          {() => (
            <BlockNoteEditorInner 
              pageId={pageId}
              title={title}
            />
          )}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
