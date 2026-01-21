# Vet Physical Exam Assistant

## Overview

A clinical workflow web application for veterinarians to conduct and document physical examinations for small animals (dogs and cats). The app guides users through a structured questionnaire covering all major body systems, allows marking findings as normal/abnormal with severity grading, and generates formatted clinical exam reports that can be copied or exported.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, local React state for exam workflow
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming, Material Design 3 inspired clinical/professional adaptation
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful JSON APIs under `/api` prefix
- **Development**: Hot module replacement via Vite middleware integration

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit for database migrations (`drizzle-kit push`)

### Core Data Models
- **Patients**: Patient demographics (name, species, breed, sex, age, weight, client info)
- **Exams**: Examination records linked to patients with status, dates, and generated reports
- **ExamFindings**: Individual system findings per exam with normal/abnormal status, severity, and detailed field data

### Exam Configuration System
- Body system configurations defined in `shared/examConfig.ts`
- Each system has configurable fields (select, multiselect, checkbox, numeric, text)
- Systems include: General/Vitals, Skin, Musculoskeletal, Neurologic, Eyes, Ears, Oral, Cardiovascular, Respiratory, Gastrointestinal, Urogenital, Lymph nodes, Endocrine
- Default normal text templates for rapid documentation

### Application Flow
1. **Patient Info**: Enter patient demographics and presenting complaint
2. **Physical Exam**: Work through body systems with normal/abnormal toggles and detail fields
3. **Report Review**: View generated clinical report, copy to clipboard or download

### Build System
- Custom build script using esbuild for server bundling and Vite for client
- Server dependencies are bundled to reduce cold start times
- Production output goes to `dist/` directory

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **connect-pg-simple**: PostgreSQL session storage support

### UI/Component Libraries
- **Radix UI**: Full suite of accessible primitive components (dialog, select, checkbox, tabs, etc.)
- **shadcn/ui**: Pre-styled component layer over Radix
- **Lucide React**: Icon library
- **Embla Carousel**: Carousel functionality
- **cmdk**: Command palette component
- **Vaul**: Drawer component
- **react-day-picker**: Calendar/date picker

### Data & Validation
- **Zod**: Schema validation throughout the stack
- **drizzle-zod**: Bridge between Drizzle schemas and Zod validation
- **date-fns**: Date manipulation utilities

### Development Tools
- **Vite**: Development server and build tool
- **TypeScript**: Type checking across the entire codebase
- **Replit plugins**: Development banner and cartographer for Replit environment