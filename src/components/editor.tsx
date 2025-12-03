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
import { CoverImage } from "@/components/cover-image";
import { BannerImage } from "@/components/banner-image";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

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
  const toggleListContentRef = useRef<{ blockId: string; content: Block["content"] } | null>(null);

  // Handle editor changes
  useEffect(() => {
    if (!editor) return;

    const handleChange = () => {
      // Check if we need to fix toggle list content movement
      if (toggleListContentRef.current) {
        const { blockId, content: originalContent } = toggleListContentRef.current;
        const currentBlock = editor.getBlock(blockId);
        
        if (currentBlock && currentBlock.type === 'toggleListItem') {
          const currentContentStr = JSON.stringify(currentBlock.content ?? []);
          const originalContentStr = JSON.stringify(originalContent);
          
          // If content was moved (original block is now empty), restore it
          if (currentContentStr !== originalContentStr && 
              (currentContentStr === '[]' || currentContentStr === 'null' || currentContentStr === '""')) {
            setTimeout(() => {
              try {
                editor.updateBlock(blockId, {
                  content: originalContent,
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

  // Fix toggle list Enter key behavior - prevent content from moving to new list item
  useEffect(() => {
    if (!editor || !isReady) return;

    const handleEnterKey = async (event: Event) => {
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
            const originalContent = JSON.parse(JSON.stringify(blockBeforeEnter.content)) as Block["content"];
            
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
              void new Promise<void>(resolve => setTimeout(() => resolve(), 10)).then(() => {
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
              });
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
    const handleEnterKeyListener = handleEnterKey as (event: Event) => void;
    if (proseMirrorElement) {
      proseMirrorElement.addEventListener('keydown', handleEnterKeyListener, { capture: true, passive: false });
    }
    if (editorElement) {
      editorElement.addEventListener('keydown', handleEnterKeyListener, { capture: true, passive: false });
    }
    document.addEventListener('keydown', handleEnterKeyListener, { capture: true, passive: false });
    
    return () => {
      if (proseMirrorElement) {
        proseMirrorElement.removeEventListener('keydown', handleEnterKeyListener, { capture: true });
      }
      if (editorElement) {
        editorElement.removeEventListener('keydown', handleEnterKeyListener, { capture: true });
      }
      document.removeEventListener('keydown', handleEnterKeyListener, { capture: true });
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
            // We know blockContent is an array from the earlier check
            // Create a new array that preserves the structure of blockContent
            const blockContentArray = Array.isArray(blockContent) ? blockContent : [];
            const remainingContentItems: Array<string | { text?: string; type?: string; [key: string]: unknown }> = [];
            
            if (checkboxMatch?.[1]?.trim() && Array.isArray(blockContentArray)) {
              // There's content after "[] ", preserve it by extracting from blockContent
              // We need to find where "[]" ends in the content array and keep everything after
              
              // Iterate through blockContent to find where "[]" or "[] " ends
              for (let i = 0; i < blockContentArray.length; i++) {
                const item = blockContentArray[i];
                if (typeof item !== 'string' && (typeof item !== 'object' || item === null)) continue;
                
                const itemText = typeof item === 'string' ? item : 
                  ('text' in item && typeof item.text === 'string' ? item.text : '');
                
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
                      if (typeof item === 'string') {
                        remainingContentItems.push(afterSpace);
                      } else if (typeof item === 'object' && item !== null) {
                        remainingContentItems.push({ ...item, text: afterSpace });
                      }
                    }
                    // Add all remaining items
                    remainingContentItems.push(...blockContentArray.slice(i + 1) as typeof remainingContentItems);
                    break;
                  } else if (afterBracket) {
                    // There's content after "[]" but no space
                    if (typeof item === 'string') {
                      remainingContentItems.push(afterBracket);
                    } else if (typeof item === 'object' && item !== null) {
                      remainingContentItems.push({ ...item, text: afterBracket });
                    }
                    // Add all remaining items
                    remainingContentItems.push(...blockContentArray.slice(i + 1) as typeof remainingContentItems);
                    break;
                  } else {
                    // "[]" is at the end of this item, content starts in next items
                    remainingContentItems.push(...blockContentArray.slice(i + 1) as typeof remainingContentItems);
                    break;
                  }
                }
              }
              
              // If we couldn't parse it from structure, use the regex match as fallback
              if (remainingContentItems.length === 0 && checkboxMatch[1]) {
                // Create content from the remaining text - BlockNote format
                const filtered = blockContentArray.filter((item) => {
                  const itemText = typeof item === 'string' ? item : 
                    (typeof item === 'object' && item !== null && 'text' in item && typeof item.text === 'string' ? item.text : '');
                  return itemText && !itemText.includes('[]');
                });
                remainingContentItems.push(...filtered as typeof remainingContentItems);
              }
            }
            
            // Update the block to be a checkListItem with preserved content
            // Get the exact type that updateBlock expects for content and extract only the array type
            type UpdateBlockParams = Parameters<typeof editor.updateBlock>[1];
            type UpdateBlockContentUnion = UpdateBlockParams extends { content?: infer C } ? C : never;
            // Extract only the array type (PartialInlineContent), excluding string and PartialTableContent
            type UpdateBlockContent = Extract<UpdateBlockContentUnion, unknown[]>;
            
            editor.updateBlock(currentBlock.id, {
              type: 'checkListItem',
              props: { checked: false },
              content: remainingContentItems as UpdateBlockContent
            });
            
            // Position cursor at the end of the checkbox content (or start if empty)
            setTimeout(() => {
              try {
                if (remainingContentItems.length > 0) {
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
        activeElement?.blur?.();
        
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

  // Disable spellcheck on all contenteditable elements in the editor
  useEffect(() => {
    if (!editor || !isReady) return;

    const disableSpellcheck = () => {
      // Find all contenteditable elements - check multiple selectors
      const editorElement = document.querySelector('.bn-editor');
      const proseMirrorElement = document.querySelector('.ProseMirror');
      
      // Check both .bn-editor and .ProseMirror containers
      const containers = [editorElement, proseMirrorElement].filter(Boolean) as Element[];
      
      containers.forEach((container) => {
        // Find all contenteditable elements
        const contenteditables = container.querySelectorAll('[contenteditable="true"], [contenteditable=""]');
        contenteditables.forEach((el) => {
          const htmlEl = el as HTMLElement;
          htmlEl.setAttribute('spellcheck', 'false');
          // Also set the property directly (some browsers need this)
          htmlEl.spellcheck = false;
        });
      });
    };

    // Run immediately
    disableSpellcheck();

    // Set up MutationObserver to catch dynamically added elements
    const observer = new MutationObserver(() => {
      disableSpellcheck();
    });

    // Observe the entire document body to catch any editor elements
    const editorElement = document.querySelector('.bn-editor');
    if (editorElement) {
      observer.observe(editorElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['contenteditable', 'spellcheck'],
      });
    }

    // Also set up a periodic check as a backup (every 500ms)
    const intervalId = setInterval(() => {
      disableSpellcheck();
    }, 500);

    // Also disable spellcheck when elements receive focus
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.contentEditable === 'true' || target.hasAttribute('contenteditable'))) {
        target.setAttribute('spellcheck', 'false');
        target.spellcheck = false;
      }
    };

    document.addEventListener('focusin', handleFocus, true);

    return () => {
      observer.disconnect();
      clearInterval(intervalId);
      document.removeEventListener('focusin', handleFocus, true);
    };
  }, [editor, isReady]);

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

import { Button } from "@/components/ui/button";
import { Pencil, Download, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function BlockNoteEditorInner({
  pageId,
  title: initialTitle,
  coverImage: initialCoverImage,
  bannerImage: initialBannerImage
}: {
  pageId: string,
  title: string,
  coverImage?: string | null,
  bannerImage?: string | null
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const [title, setTitle] = useState(initialTitle);
  const [coverImage, setCoverImage] = useState(initialCoverImage);
  const [bannerImage, setBannerImage] = useState(initialBannerImage);
  const [status, setStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTitleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBannerDialogOpen, setIsBannerDialogOpen] = useState(false);
  
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
      void utils.page.getPage.invalidate({ pageId });
      void utils.workspace.getWorkspace.invalidate();
      router.refresh();
    },
    onError: (error) => {
      console.error("Failed to save title", error);
      setStatus("unsaved");
    }
  });

  const updateCoverImage = api.page.updateCoverImage.useMutation({
    onMutate: () => {
      setStatus("saving");
    },
    onSuccess: () => {
      setStatus("saved");
      router.refresh();
    },
    onError: (error) => {
      console.error("Failed to save cover image", error);
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

  const handleCoverUpdate = (url: string | null) => {
    setCoverImage(url);
    updateCoverImage.mutate({ pageId, coverImage: url });
  };

  const updateBannerImage = api.page.updateBannerImage.useMutation({
    onMutate: () => {
      setStatus("saving");
    },
    onSuccess: () => {
      setStatus("saved");
      router.refresh();
    },
    onError: (error) => {
      console.error("Failed to save banner image", error);
      setStatus("unsaved");
    }
  });

  const handleBannerUpdate = (url: string | null) => {
    setBannerImage(url);
    updateBannerImage.mutate({ pageId, bannerImage: url });
  };

  useEffect(() => {
    return () => {
      if (saveTitleTimeoutRef.current) {
        clearTimeout(saveTitleTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8 relative overflow-visible pb-20">
      {/* Banner Image - Full width at top, behind other content */}
      {bannerImage && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-screen h-55 z-0">
          <BannerImage
            url={bannerImage}
            editable={false}
            onUpdate={() => { /* read-only */ }}
          />
        </div>
      )}

      {/* Saved Status - Top Right */}
      <div className="absolute top-4 right-6 text-xs text-muted-foreground z-10">
        {status === "saving" && <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saving</span>}
        {status === "saved" && "Saved"}
        {status === "unsaved" && "Unsaved"}
      </div>

      {/* New Header Layout */}
      <div className={`flex flex-col md:flex-row gap-6 items-end px-[54px] relative z-10 ${bannerImage ? 'pt-24.5' : 'pt-12'}`}>
        {/* Cover Image - Smaller size (w-40 = 10rem) */}
        <div className="w-40 h-40 flex-shrink-0">
            <CoverImage
              url={coverImage}
              editable={false} // Read-only in main view
              onUpdate={() => { /* read-only */ }}
              onClick={() => setIsEditDialogOpen(true)}
            />
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 min-w-0 pb-4">
          {/* Title - Bricolage Grotesque (matches H1) */}
          <Input
            value={title}
            onChange={handleTitleChange}
            spellCheck={false}
            className="font-serif font-black tracking-tight border-none px-0 -mb-2 shadow-none focus-visible:ring-0 h-auto placeholder:text-muted-foreground/50 bg-transparent w-full text-6xl md:text-9xl"
            placeholder="Untitled"
            style={{ fontFamily: 'var(--font-bricolage), ui-serif, Georgia, Cambria, "Times New Roman", Times, serif', fontSize: '4.5rem', fontWeight: 700 }}
          />
          
          {/* Action Buttons */}
          <div className="flex items-center gap-0.5 pl-2">
             <ShareDialog pageId={pageId} />

             <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
               <DialogTrigger asChild>
                 <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                   <Pencil className="h-6 w-6" />
                 </Button>
               </DialogTrigger>
               <DialogContent>
                 <DialogHeader>
                   <DialogTitle>Edit Page Details</DialogTitle>
                 </DialogHeader>
                 <div className="space-y-6 py-4">
                   <div className="flex flex-col gap-2">
                     <label className="text-sm font-medium">Cover Image</label>
                    <div className="w-40 h-40 mx-auto">
                      <CoverImage 
                        key="edit-dialog-cover"
                        url={coverImage} 
                        editable={true} 
                        onUpdate={handleCoverUpdate} 
                      />
                    </div>
                   </div>
                   <div className="flex flex-col gap-2">
                     <label className="text-sm font-medium">Title</label>
                     <Input 
                       value={title} 
                       onChange={handleTitleChange}
                       className="font-serif"
                     />
                   </div>
                 </div>
               </DialogContent>
             </Dialog>

             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
               <Download className="h-6 w-6" />
             </Button>

             <Dialog open={isBannerDialogOpen} onOpenChange={setIsBannerDialogOpen}>
               <DialogTrigger asChild>
                 <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                   <ImageIcon className="h-6 w-6" />
                 </Button>
               </DialogTrigger>
               <DialogContent>
                 <DialogHeader>
                   <DialogTitle>Edit Banner Image</DialogTitle>
                 </DialogHeader>
                 <div className="space-y-4 py-4">
                   <div className="flex flex-col gap-2">
                     <label className="text-sm font-medium">Banner Image</label>
                     <div className="h-64">
                       <BannerImage
                         url={bannerImage}
                         editable={true}
                         onUpdate={handleBannerUpdate}
                       />
                     </div>
                   </div>
                 </div>
               </DialogContent>
             </Dialog>
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
  title,
  coverImage,
  bannerImage
}: {
  pageId: string,
  title: string,
  coverImage?: string | null,
  bannerImage?: string | null
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
              coverImage={coverImage}
              bannerImage={bannerImage}
            />
          )}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
