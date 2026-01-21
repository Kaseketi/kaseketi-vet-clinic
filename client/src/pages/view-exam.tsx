import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientInfoCard } from "@/components/PatientInfoCard";
import { ReportPreview } from "@/components/ReportPreview";
import { ArrowLeft, Stethoscope } from "lucide-react";
import type { ExamWithFindings } from "@shared/schema";

export default function ViewExam() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();

  const { data: exam, isLoading, error } = useQuery<ExamWithFindings>({
    queryKey: ["/api/exams", params.id],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 md:px-6">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/history")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Skeleton className="h-6 w-48" />
          </div>
        </header>
        <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-[500px] w-full" />
        </main>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 md:px-6">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/history")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">View Examination</h1>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6 md:px-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-destructive">Failed to load exam. It may have been deleted.</p>
              <Button className="mt-4" onClick={() => setLocation("/history")}>
                Back to History
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/history")} data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">
                Exam - {exam.patient.name}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-6">
        <PatientInfoCard
          patient={exam.patient}
          examDate={new Date(exam.examDate)}
          presentingComplaint={exam.presentingComplaint || undefined}
        />

        <div className="h-[600px]">
          <ReportPreview
            report={exam.generatedReport || "No report generated."}
            patientName={exam.patient.name}
          />
        </div>
      </main>
    </div>
  );
}
