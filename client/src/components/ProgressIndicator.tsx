import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle } from "lucide-react";

interface ProgressIndicatorProps {
  completedCount: number;
  totalCount: number;
  systemNames?: { name: string; displayName: string; completed: boolean }[];
}

export function ProgressIndicator({ completedCount, totalCount, systemNames }: ProgressIndicatorProps) {
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Examination Progress</span>
        <span className="text-muted-foreground" data-testid="text-progress-count">
          {completedCount} of {totalCount} systems complete
        </span>
      </div>
      <Progress value={percentage} className="h-2" data-testid="progress-bar" />
      {systemNames && systemNames.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {systemNames.map((system) => (
            <div
              key={system.name}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
                system.completed
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
              data-testid={`badge-system-${system.name}`}
            >
              {system.completed ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              <span>{system.displayName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
