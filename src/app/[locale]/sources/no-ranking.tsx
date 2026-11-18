import { InboxIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

/** Shown before a Source's first collection run, with the command that runs one. */
export function NoRanking({ children, command }: { children: ReactNode; command: string }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InboxIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h2>No ranking collected yet</h2>
        </EmptyTitle>
        <EmptyDescription>
          {children} To collect one now, run <code className="font-mono text-foreground">{command}</code>.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
