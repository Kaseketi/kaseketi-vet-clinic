import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { PlusCircle, History, Stethoscope, FileText, PawPrint, LogOut, User, Settings } from "lucide-react";

export default function Home() {
  const { user, logout } = useAuth();

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "veterinarian":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "technician":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with user menu */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            <span className="font-semibold">Kaseketi Veterinary Clinic</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user ? getInitials(user.firstName, user.lastName) : "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  <span className={`mt-1 inline-block w-fit rounded-full px-2 py-0.5 text-xs font-medium ${getRoleBadgeColor(user?.role || "")}`}>
                    {user?.role?.charAt(0).toUpperCase()}{user?.role?.slice(1)}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <div className="mb-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-md bg-primary">
              <Stethoscope className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Welcome, Dr. {user?.lastName || "Veterinarian"}
          </h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Kaseketi Veterinary Clinic Practice Management System.
            Conduct physical exams and generate structured clinical reports.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="hover-elevate transition-transform">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                New Examination
              </CardTitle>
              <CardDescription>
                Start a new physical exam for a patient. Enter patient details and work through
                each body system methodically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/exam/new">
                <Button className="w-full" data-testid="button-new-exam">
                  <PawPrint className="mr-2 h-4 w-4" />
                  Start New Exam
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-transform">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Exam History
              </CardTitle>
              <CardDescription>
                View and manage previous examinations. Access saved reports and continue
                draft exams.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/history">
                <Button variant="outline" className="w-full" data-testid="button-view-history">
                  <FileText className="mr-2 h-4 w-4" />
                  View Exam History
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                    1
                  </div>
                  <h3 className="mb-1 font-medium">Enter Patient Info</h3>
                  <p className="text-sm text-muted-foreground">
                    Record signalment and presenting complaint for the patient.
                  </p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                    2
                  </div>
                  <h3 className="mb-1 font-medium">Complete Systems Exam</h3>
                  <p className="text-sm text-muted-foreground">
                    Work through each body system, marking normal or documenting abnormalities.
                  </p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                    3
                  </div>
                  <h3 className="mb-1 font-medium">Generate Report</h3>
                  <p className="text-sm text-muted-foreground">
                    Get a formatted clinical report ready for your records.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Kaseketi Veterinary Clinic. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
