import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Patient } from "@shared/schema";
import { Calendar, User, PawPrint, Scale } from "lucide-react";

interface PatientInfoCardProps {
  patient: Partial<Patient>;
  examDate?: Date;
  presentingComplaint?: string;
  compact?: boolean;
}

export function PatientInfoCard({ patient, examDate, presentingComplaint, compact = false }: PatientInfoCardProps) {
  if (compact) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <PawPrint className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{patient.name || "Unknown"}</span>
              <span className="text-muted-foreground">
                ({patient.species || "Species"} - {patient.breed || "Breed"})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{patient.clientName || "Client"}</span>
            </div>
            {examDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{examDate.toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PawPrint className="h-5 w-5" />
          Patient Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Patient Name</p>
            <p className="font-medium" data-testid="text-patient-name">{patient.name || "Not specified"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Species</p>
            <p className="font-medium" data-testid="text-species">{patient.species || "Not specified"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Breed</p>
            <p className="font-medium" data-testid="text-breed">{patient.breed || "Not specified"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Sex</p>
            <p className="font-medium" data-testid="text-sex">
              {patient.sex || "Not specified"} ({patient.neuterStatus || "Unknown"})
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Age</p>
            <p className="font-medium" data-testid="text-age">{patient.age || "Not specified"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Weight</p>
            <p className="font-medium" data-testid="text-weight">
              <Scale className="mr-1 inline-block h-4 w-4" />
              {patient.weight || "Not specified"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Client Name</p>
            <p className="font-medium" data-testid="text-client">{patient.clientName || "Not specified"}</p>
          </div>
          {examDate && (
            <div>
              <p className="text-sm text-muted-foreground">Exam Date</p>
              <p className="font-medium" data-testid="text-exam-date">
                {examDate.toLocaleDateString()} {examDate.toLocaleTimeString()}
              </p>
            </div>
          )}
          {presentingComplaint && (
            <div className="md:col-span-2 lg:col-span-3">
              <p className="text-sm text-muted-foreground">Presenting Complaint</p>
              <p className="font-medium" data-testid="text-complaint">{presentingComplaint}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
