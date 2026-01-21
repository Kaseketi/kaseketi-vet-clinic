import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Download, Check, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReportPreviewProps {
  report: string;
  patientName?: string;
}

export function ReportPreview({ report, patientName = "Patient" }: ReportPreviewProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "The exam report has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please try selecting and copying the text manually.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = () => {
    const element = document.createElement("a");
    const file = new Blob([report], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    const filename = `${patientName.replace(/\s+/g, "_")}_exam_${new Date().toISOString().split("T")[0]}.txt`;
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast({
      title: "Report downloaded",
      description: `Saved as ${filename}`,
    });
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-shrink-0 border-b pb-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Exam Report Preview
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCopy}
              data-testid="button-copy-report"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>
            <Button onClick={handleDownloadPDF} data-testid="button-download-report">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <pre
            className="whitespace-pre-wrap p-4 font-mono text-sm leading-relaxed"
            data-testid="text-report-content"
          >
            {report}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
