import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Search,
  PlusCircle,
  Calendar,
  PawPrint,
  User,
  FileText,
  Stethoscope,
} from "lucide-react";
import { useState, useMemo } from "react";
import type { ExamWithPatient } from "@shared/schema";

export default function ExamHistory() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: exams, isLoading, error } = useQuery<ExamWithPatient[]>({
    queryKey: ["/api/exams"],
  });

  const filteredExams = useMemo(() => {
    if (!exams) return [];
    if (!searchTerm) return exams;

    const term = searchTerm.toLowerCase();
    return exams.filter(
      (exam) =>
        exam.patient.name.toLowerCase().includes(term) ||
        exam.patient.clientName.toLowerCase().includes(term) ||
        exam.patient.species?.toLowerCase().includes(term) ||
        exam.presentingComplaint?.toLowerCase().includes(term)
    );
  }, [exams, searchTerm]);

  const formatDate = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return <Badge variant="default">Complete</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderLoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-medium">No Examinations Yet</h3>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Start your first physical examination to see it appear here.
        </p>
        <Link href="/exam/new">
          <Button data-testid="button-first-exam">
            <PlusCircle className="mr-2 h-4 w-4" />
            Start First Exam
          </Button>
        </Link>
      </CardContent>
    </Card>
  );

  const renderExamList = () => (
    <ScrollArea className="h-[calc(100vh-280px)]">
      <div className="space-y-4 pr-4">
        {filteredExams.map((exam) => (
          <Card
            key={exam.id}
            className="hover-elevate cursor-pointer transition-colors"
            onClick={() => setLocation(`/exam/${exam.id}`)}
            data-testid={`card-exam-${exam.id}`}
          >
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium" data-testid={`text-patient-name-${exam.id}`}>
                      {exam.patient.name}
                    </h3>
                    {getStatusBadge(exam.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <PawPrint className="h-3.5 w-3.5" />
                      {exam.patient.species} - {exam.patient.breed || "Unknown breed"}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {exam.patient.clientName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(exam.examDate)}
                    </span>
                  </div>
                  {exam.presentingComplaint && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      <span className="font-medium">CC:</span> {exam.presentingComplaint}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" data-testid={`button-view-${exam.id}`}>
                  View Report
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredExams.length === 0 && searchTerm && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No exams found matching "{searchTerm}"</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Exam History</h1>
            </div>
          </div>
          <Link href="/exam/new">
            <Button data-testid="button-new-exam">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Exam
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 md:px-6">
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Search Examinations</CardTitle>
            <CardDescription>Find exams by patient name, owner, or presenting complaint</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search exams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
          </CardContent>
        </Card>

        {isLoading && renderLoadingSkeleton()}
        {error && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-destructive">Failed to load exams. Please try again.</p>
            </CardContent>
          </Card>
        )}
        {!isLoading && !error && exams?.length === 0 && renderEmptyState()}
        {!isLoading && !error && exams && exams.length > 0 && renderExamList()}
      </main>
    </div>
  );
}
