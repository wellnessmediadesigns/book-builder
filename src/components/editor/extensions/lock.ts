import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    lock: {
      setLock: () => ReturnType;
      unsetLock: () => ReturnType;
      toggleLock: () => ReturnType;
    };
  }
}

/**
 * Lock — a mark that flags finalized text. AI commands refuse to touch
 * any range that carries it. Rendered with a brass spine in the canvas.
 */
export const Lock = Mark.create({
  name: "lock",
  inclusive: false,
  excludes: "",

  parseHTML() {
    return [{ tag: "span[data-lock]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-lock": "true", class: "locked" }),
      0,
    ];
  },

  addCommands() {
    return {
      setLock:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),
      unsetLock:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
      toggleLock:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },
});
