import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface DragHandleOptions {
  element: HTMLElement | null;
  onNodeChange: (node: HTMLElement | null) => void;
}

export const DragHandle = Extension.create<DragHandleOptions>({
  name: "dragHandle",

  addOptions() {
    return {
      element: null,
      onNodeChange: () => {},
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("dragHandle"),
        props: {
          handleDOMEvents: {
            mousemove: (view, event) => {
              if (!view.editable) {
                return false;
              }

              const node = view.domAtPos(view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos || 0).node as HTMLElement;
              
              // Find the nearest block-level element
              let blockNode = node;
              while (blockNode && blockNode.parentElement !== view.dom) {
                 if (blockNode.parentElement) {
                    blockNode = blockNode.parentElement;
                 } else {
                    break;
                 }
              }

              if (blockNode && blockNode.nodeType === 1) {
                 this.options.onNodeChange(blockNode);
              } else {
                 this.options.onNodeChange(null);
              }

              return false;
            },
            mouseleave: () => {
               this.options.onNodeChange(null);
               return false;
            }
          },
        },
      }),
    ];
  },
});
