import { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientInfoCard } from "@/components/PatientInfoCard";
import { SystemCard } from "@/components/SystemCard";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { ReportPreview } from "@/components/ReportPreview";
import { examSystemsConfig, speciesOptions, sexOptions, neuterStatusOptions } from "@shared/examConfig";
import { createInitialExamState, generateReport, type ExamState, type ExamFindingState } from "@/lib/examStore";
import type { Patient } from "@shared/schema";
import { ArrowLeft, ArrowRight, FileText, Save, Stethoscope, User } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ExamStep = "patient" | "exam" | "report";

export default function NewExam() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<ExamStep>("patient");
  const [examState, setExamState] = useState<ExamState>(createInitialExamState);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const completedSystems = useMemo(() => {
    return new Set(
      Object.entries(examState.findings)
        .filter(([, finding]) => finding.isNormal || (finding.severity && finding.severity !== ""))
        .map(([key]) => key)
    );
  }, [examState.findings]);

  const systemProgressData = useMemo(() => {
    return examSystemsConfig.map((system) => ({
      name: system.name,
      displayName: system.displayName,
      completed: completedSystems.has(system.name),
    }));
  }, [completedSystems]);

  const generatedReport = useMemo(() => {
    return generateReport({ ...examState, completedSystems });
  }, [examState, completedSystems]);

  const handlePatientChange = useCallback((field: keyof Patient, value: string) => {
    setExamState((prev) => ({
      ...prev,
      patient: {
        ...prev.patient,
        [field]: value,
      },
    }));
  }, []);

  const handleFindingChange = useCallback((systemName: string, finding: ExamFindingState) => {
    setExamState((prev) => ({
      ...prev,
      findings: {
        ...prev.findings,
        [systemName]: finding,
      },
    }));
  }, []);

  const handleSystemComplete = useCallback((systemName: string) => {
    setExamState((prev) => ({
      ...prev,
      completedSystems: new Set([...Array.from(prev.completedSystems), systemName]),
    }));
  }, []);

  const handlePresentingComplaintChange = useCallback((value: string) => {
    setExamState((prev) => ({
      ...prev,
      presentingComplaint: value,
    }));
  }, []);

  const handlePlanNotesChange = useCallback((value: string) => {
    setExamState((prev) => ({
      ...prev,
      planNotes: value,
    }));
  }, []);

  const handleExaminerChange = useCallback((value: string) => {
    setExamState((prev) => ({
      ...prev,
      examiner: value,
    }));
  }, []);

  const saveExamMutation = useMutation({
    mutationFn: async () => {
      const patientResponse = await apiRequest("POST", "/api/patients", {
        name: examState.patient.name || "Unknown Patient",
        species: examState.patient.species || "canine",
        breed: examState.patient.breed || "",
        sex: examState.patient.sex || "unknown",
        neuterStatus: examState.patient.neuterStatus || "unknown",
        age: examState.patient.age || "",
        weight: examState.patient.weight || "",
        clientName: examState.patient.clientName || "Unknown Client",
      });
      const patient = await patientResponse.json();

      const examResponse = await apiRequest("POST", "/api/exams", {
        patientId: patient.id,
        examDate: examState.examDate.toISOString(),
        examiner: examState.examiner || null,
        presentingComplaint: examState.presentingComplaint,
        planNotes: examState.planNotes,
        status: "complete",
        generatedReport: generatedReport,
      });
      const exam = await examResponse.json();

      const findingPromises = Object.entries(examState.findings).map(([systemName, finding]) =>
        apiRequest("POST", "/api/exam-findings", {
          examId: exam.id,
          systemName,
          isNormal: finding.isNormal,
          severity: finding.severity || null,
          findings: finding.findings,
          notes: finding.notes,
        })
      );

      await Promise.all(findingPromises);
      return exam;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      toast({
        title: "Exam saved successfully",
        description: "The examination has been saved to history.",
      });
      setLocation("/history");
    },
    onError: (error) => {
      toast({
        title: "Failed to save exam",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const isPatientValid = examState.patient.name && examState.patient.species && examState.patient.clientName;

  const renderPatientForm = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Patient Details
          </CardTitle>
          <CardDescription>Enter the patient signalment and owner information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="patientName">Patient Name *</Label>
              <Input
                id="patientName"
                value={examState.patient.name || ""}
                onChange={(e) => handlePatientChange("name", e.target.value)}
                placeholder="Enter patient name"
                data-testid="input-patient-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="species">Species *</Label>
              <Select
                value={examState.patient.species || ""}
                onValueChange={(v) => handlePatientChange("species", v)}
              >
                <SelectTrigger id="species" data-testid="select-species">
                  <SelectValue placeholder="Select species" />
                </SelectTrigger>
                <SelectContent>
                  {speciesOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="breed">Breed</Label>
              <Input
                id="breed"
                value={examState.patient.breed || ""}
                onChange={(e) => handlePatientChange("breed", e.target.value)}
                placeholder="Enter breed"
                data-testid="input-breed"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sex">Sex</Label>
              <Select
                value={examState.patient.sex || ""}
                onValueChange={(v) => handlePatientChange("sex", v)}
              >
                <SelectTrigger id="sex" data-testid="select-sex">
                  <SelectValue placeholder="Select sex" />
                </SelectTrigger>
                <SelectContent>
                  {sexOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="neuterStatus">Neuter Status</Label>
              <Select
                value={examState.patient.neuterStatus || ""}
                onValueChange={(v) => handlePatientChange("neuterStatus", v)}
              >
                <SelectTrigger id="neuterStatus" data-testid="select-neuter-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {neuterStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                value={examState.patient.age || ""}
                onChange={(e) => handlePatientChange("age", e.target.value)}
                placeholder="e.g., 5 years"
                data-testid="input-age"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                value={examState.patient.weight || ""}
                onChange={(e) => handlePatientChange("weight", e.target.value)}
                placeholder="e.g., 25 lbs"
                data-testid="input-weight"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={examState.patient.clientName || ""}
                onChange={(e) => handlePatientChange("clientName", e.target.value)}
                placeholder="Enter owner name"
                data-testid="input-client-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="examiner">Examining Veterinarian</Label>
              <Input
                id="examiner"
                value={examState.examiner || ""}
                onChange={(e) => handleExaminerChange(e.target.value)}
                placeholder="Dr. Smith, DVM"
                data-testid="input-examiner"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="presentingComplaint">Presenting Complaint</Label>
            <Textarea
              id="presentingComplaint"
              value={examState.presentingComplaint}
              onChange={(e) => handlePresentingComplaintChange(e.target.value)}
              placeholder="Describe the reason for visit..."
              className="min-h-[80px]"
              data-testid="textarea-complaint"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderExamForm = () => (
    <div className="space-y-6">
      <PatientInfoCard
        patient={examState.patient}
        examDate={examState.examDate}
        presentingComplaint={examState.presentingComplaint}
        compact
      />

      <Card>
        <CardContent className="pt-6">
          <ProgressIndicator
            completedCount={completedSystems.size}
            totalCount={examSystemsConfig.length}
            systemNames={systemProgressData}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {examSystemsConfig.map((system) => (
          <SystemCard
            key={system.name}
            config={system}
            finding={examState.findings[system.name]}
            onFindingChange={(finding) => handleFindingChange(system.name, finding)}
            onComplete={() => handleSystemComplete(system.name)}
            isCompleted={completedSystems.has(system.name)}
          />
        ))}
      </div>
    </div>
  );

  const renderReportForm = () => (
    <div className="space-y-6">
      <PatientInfoCard
        patient={examState.patient}
        examDate={examState.examDate}
        presentingComplaint={examState.presentingComplaint}
        compact
      />

      <Card>
        <CardHeader>
          <CardTitle>Plan Notes</CardTitle>
          <CardDescription>Enter your treatment plan and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={examState.planNotes}
            onChange={(e) => handlePlanNotesChange(e.target.value)}
            placeholder="Enter diagnostic plans, treatment recommendations, client instructions..."
            className="min-h-[120px]"
            data-testid="textarea-plan-notes"
          />
        </CardContent>
      </Card>

      <div className="h-[500px]">
        <ReportPreview report={generatedReport} patientName={examState.patient.name} />
      </div>
    </div>
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
              <h1 className="text-lg font-semibold">New Examination</h1>
            </div>
          </div>
          <Button
            onClick={() => saveExamMutation.mutate()}
            disabled={saveExamMutation.isPending || !isPatientValid}
            data-testid="button-save-exam"
          >
            <Save className="mr-2 h-4 w-4" />
            {saveExamMutation.isPending ? "Saving..." : "Save Exam"}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 md:px-6">
        <Tabs value={currentStep} onValueChange={(v) => setCurrentStep(v as ExamStep)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="patient" className="gap-2" data-testid="tab-patient">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Patient Info</span>
              <span className="sm:hidden">Patient</span>
            </TabsTrigger>
            <TabsTrigger value="exam" className="gap-2" data-testid="tab-exam">
              <Stethoscope className="h-4 w-4" />
              <span className="hidden sm:inline">Physical Exam</span>
              <span className="sm:hidden">Exam</span>
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-2" data-testid="tab-report">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Report</span>
              <span className="sm:hidden">Report</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patient" className="mt-6">
            {renderPatientForm()}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => setCurrentStep("exam")}
                disabled={!isPatientValid}
                data-testid="button-next-exam"
              >
                Continue to Exam
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="exam" className="mt-6">
            {renderExamForm()}
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep("patient")} data-testid="button-back-patient">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Patient
              </Button>
              <Button onClick={() => setCurrentStep("report")} data-testid="button-next-report">
                Generate Report
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="report" className="mt-6">
            {renderReportForm()}
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep("exam")} data-testid="button-back-exam">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Exam
              </Button>
              <Button
                onClick={() => saveExamMutation.mutate()}
                disabled={saveExamMutation.isPending}
                data-testid="button-save-final"
              >
                <Save className="mr-2 h-4 w-4" />
                {saveExamMutation.isPending ? "Saving..." : "Save & Finish"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
