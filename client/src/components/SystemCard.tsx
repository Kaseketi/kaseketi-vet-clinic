import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ExamSystemConfig, SystemField } from "@shared/schema";
import type { ExamFindingState } from "@/lib/examStore";
import { ChevronDown, ChevronUp, Check, AlertTriangle } from "lucide-react";

interface SystemCardProps {
  config: ExamSystemConfig;
  finding: ExamFindingState;
  onFindingChange: (finding: ExamFindingState) => void;
  onComplete: () => void;
  isCompleted: boolean;
}

const severityOptions = ["Mild", "Moderate", "Severe"];

export function SystemCard({ config, finding, onFindingChange, onComplete, isCompleted }: SystemCardProps) {
  const [isOpen, setIsOpen] = useState(!finding.isNormal);

  const handleNormalToggle = (isNormal: boolean) => {
    onFindingChange({
      ...finding,
      isNormal,
      severity: isNormal ? undefined : finding.severity,
    });
    if (!isNormal) {
      setIsOpen(true);
    }
  };

  const handleSeverityChange = (severity: string) => {
    onFindingChange({
      ...finding,
      severity,
    });
  };

  const handleFieldChange = (fieldName: string, value: unknown) => {
    onFindingChange({
      ...finding,
      findings: {
        ...finding.findings,
        [fieldName]: value,
      },
    });
  };

  const handleNotesChange = (notes: string) => {
    onFindingChange({
      ...finding,
      notes,
    });
  };

  const handleMultiselectToggle = (fieldName: string, option: string) => {
    const currentValues = (finding.findings[fieldName] as string[]) || [];
    const newValues = currentValues.includes(option)
      ? currentValues.filter((v) => v !== option)
      : [...currentValues, option];
    handleFieldChange(fieldName, newValues);
  };

  const renderField = (field: SystemField) => {
    const value = finding.findings[field.name];

    switch (field.type) {
      case "checkbox":
        return (
          <div key={field.name} className="flex items-center gap-2">
            <Checkbox
              id={`${config.name}-${field.name}`}
              checked={!!value}
              onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
              data-testid={`checkbox-${config.name}-${field.name}`}
            />
            <Label htmlFor={`${config.name}-${field.name}`} className="cursor-pointer">
              {field.label}
            </Label>
          </div>
        );

      case "select":
        return (
          <div key={field.name} className="space-y-1.5">
            <Label htmlFor={`${config.name}-${field.name}`}>{field.label}</Label>
            <Select
              value={(value as string) || ""}
              onValueChange={(v) => handleFieldChange(field.name, v)}
            >
              <SelectTrigger
                id={`${config.name}-${field.name}`}
                data-testid={`select-${config.name}-${field.name}`}
              >
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "multiselect":
        const selectedValues = (value as string[]) || [];
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label}</Label>
            <div className="flex flex-wrap gap-2">
              {field.options?.map((option) => (
                <Badge
                  key={option}
                  variant={selectedValues.includes(option) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleMultiselectToggle(field.name, option)}
                  data-testid={`multiselect-${config.name}-${field.name}-${option}`}
                >
                  {option}
                </Badge>
              ))}
            </div>
          </div>
        );

      case "numeric":
        return (
          <div key={field.name} className="space-y-1.5">
            <Label htmlFor={`${config.name}-${field.name}`}>
              {field.label} {field.unit && <span className="text-muted-foreground">({field.unit})</span>}
            </Label>
            <Input
              id={`${config.name}-${field.name}`}
              type="number"
              value={(value as number) || ""}
              onChange={(e) => handleFieldChange(field.name, e.target.value ? parseFloat(e.target.value) : "")}
              placeholder={field.unit || "Enter value"}
              data-testid={`input-${config.name}-${field.name}`}
            />
          </div>
        );

      case "text":
        return (
          <div key={field.name} className="space-y-1.5">
            <Label htmlFor={`${config.name}-${field.name}`}>{field.label}</Label>
            <Textarea
              id={`${config.name}-${field.name}`}
              value={(value as string) || ""}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              className="min-h-[60px]"
              data-testid={`textarea-${config.name}-${field.name}`}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card
      className={`transition-colors ${
        isCompleted ? "border-primary/30 bg-primary/5" : ""
      } ${!finding.isNormal ? "border-orange-500/30 bg-orange-50/50 dark:bg-orange-950/20" : ""}`}
      data-testid={`card-system-${config.name}`}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">{config.displayName}</CardTitle>
              {isCompleted && (
                <Badge variant="secondary" className="gap-1">
                  <Check className="h-3 w-3" />
                  Complete
                </Badge>
              )}
              {!finding.isNormal && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Abnormal
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <Button
                  variant={finding.isNormal ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleNormalToggle(true)}
                  data-testid={`button-normal-${config.name}`}
                >
                  Normal
                </Button>
                <Button
                  variant={!finding.isNormal ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => handleNormalToggle(false)}
                  data-testid={`button-abnormal-${config.name}`}
                >
                  Abnormal
                </Button>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`button-expand-${config.name}`}>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 border-t pt-4">
            {!finding.isNormal && (
              <div className="space-y-2">
                <Label>Severity</Label>
                <div className="flex gap-2">
                  {severityOptions.map((option) => (
                    <Button
                      key={option}
                      variant={finding.severity === option ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSeverityChange(option)}
                      data-testid={`button-severity-${config.name}-${option.toLowerCase()}`}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {config.fields.map((field) => renderField(field))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${config.name}-notes`}>Additional Notes</Label>
              <Textarea
                id={`${config.name}-notes`}
                value={finding.notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Enter any additional observations..."
                className="min-h-[80px]"
                data-testid={`textarea-notes-${config.name}`}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={onComplete} data-testid={`button-complete-${config.name}`}>
                <Check className="mr-2 h-4 w-4" />
                Mark Complete
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
