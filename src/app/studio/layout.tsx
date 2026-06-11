import { CommandPalette } from "@/components/studio/command-palette";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      {children}
      <CommandPalette />
    </div>
  );
}
