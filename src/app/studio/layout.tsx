import { CommandPalette } from "@/components/studio/command-palette";
import { ShortcutsSheet } from "@/components/studio/shortcuts";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      {children}
      <CommandPalette />
      <ShortcutsSheet />
    </div>
  );
}
