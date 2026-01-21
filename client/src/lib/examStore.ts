import type { Patient, ExamFinding, ExamSystemConfig } from "@shared/schema";
import { examSystemsConfig } from "@shared/examConfig";

export interface ExamState {
  patient: Partial<Patient>;
  examDate: Date;
  examiner: string;
  presentingComplaint: string;
  planNotes: string;
  findings: Record<string, ExamFindingState>;
  completedSystems: Set<string>;
}

export interface ExamFindingState {
  systemName: string;
  isNormal: boolean;
  severity?: string;
  findings: Record<string, unknown>;
  notes: string;
}

export function createInitialExamState(): ExamState {
  const findings: Record<string, ExamFindingState> = {};
  
  examSystemsConfig.forEach((system) => {
    findings[system.name] = {
      systemName: system.name,
      isNormal: true,
      severity: undefined,
      findings: {},
      notes: "",
    };
  });

  return {
    patient: {},
    examDate: new Date(),
    examiner: "",
    presentingComplaint: "",
    planNotes: "",
    findings,
    completedSystems: new Set(),
  };
}

export function generateReport(state: ExamState, clinicName: string = "KASEKETI VETERINARY CLINIC"): string {
  const { patient, examDate, examiner, presentingComplaint, planNotes, findings } = state;

  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push(`           ${clinicName.toUpperCase()}`);
  lines.push("              PHYSICAL EXAMINATION REPORT");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  
  lines.push("PATIENT INFORMATION");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push(`Patient Name: ${patient.name || "Not specified"}`);
  lines.push(`Species: ${patient.species || "Not specified"}`);
  lines.push(`Breed: ${patient.breed || "Not specified"}`);
  lines.push(`Sex: ${patient.sex || "Not specified"} (${patient.neuterStatus || "Unknown"})`);
  lines.push(`Age: ${patient.age || "Not specified"}`);
  lines.push(`Weight: ${patient.weight || "Not specified"}`);
  lines.push(`Client: ${patient.clientName || "Not specified"}`);
  lines.push(`Exam Date: ${examDate.toLocaleDateString()} ${examDate.toLocaleTimeString()}`);
  lines.push(`Examining Veterinarian: ${examiner || "Not specified"}`);
  lines.push("");
  
  lines.push("SUBJECTIVE");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push(`Presenting Complaint: ${presentingComplaint || "None provided"}`);
  lines.push("");
  
  lines.push("OBJECTIVE - PHYSICAL EXAMINATION");
  lines.push("───────────────────────────────────────────────────────────────");
  
  const abnormalFindings: string[] = [];
  
  examSystemsConfig.forEach((systemConfig) => {
    const finding = findings[systemConfig.name];
    if (!finding) return;
    
    lines.push("");
    lines.push(`${systemConfig.displayName.toUpperCase()}`);
    
    if (finding.isNormal) {
      lines.push(systemConfig.defaultNormalText);
    } else {
      const detailLines: string[] = [];
      
      if (finding.severity) {
        detailLines.push(`Severity: ${finding.severity}`);
        abnormalFindings.push(`${systemConfig.displayName}: ${finding.severity} abnormality`);
      }
      
      Object.entries(finding.findings || {}).forEach(([fieldName, value]) => {
        const fieldConfig = systemConfig.fields.find(f => f.name === fieldName);
        if (fieldConfig && value !== undefined && value !== null && value !== "" && value !== false) {
          if (Array.isArray(value)) {
            if (value.length > 0) {
              detailLines.push(`${fieldConfig.label}: ${value.join(", ")}`);
            }
          } else if (typeof value === "boolean") {
            detailLines.push(`${fieldConfig.label}: Yes`);
          } else {
            const displayValue = fieldConfig.unit ? `${value} ${fieldConfig.unit}` : value;
            detailLines.push(`${fieldConfig.label}: ${displayValue}`);
          }
        }
      });
      
      if (finding.notes) {
        detailLines.push(`Notes: ${finding.notes}`);
      }
      
      if (detailLines.length > 0) {
        lines.push(detailLines.join(". ") + ".");
      } else {
        lines.push("Abnormalities noted - see additional notes.");
      }
    }
  });
  
  lines.push("");
  lines.push("ASSESSMENT");
  lines.push("───────────────────────────────────────────────────────────────");
  if (abnormalFindings.length > 0) {
    lines.push("Key abnormal findings:");
    abnormalFindings.forEach((finding, index) => {
      lines.push(`  ${index + 1}. ${finding}`);
    });
  } else {
    lines.push("No significant abnormalities detected on physical examination.");
  }
  
  lines.push("");
  lines.push("PLAN");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push(planNotes || "To be determined.");
  
  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push(`Report generated: ${new Date().toLocaleString()}`);
  lines.push("═══════════════════════════════════════════════════════════════");
  
  return lines.join("\n");
}
