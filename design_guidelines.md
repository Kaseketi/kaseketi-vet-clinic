# Vet Physical Exam Assistant - Design Guidelines

## Design Approach

**Selected System**: Material Design 3 (Clinical/Professional Adaptation)

**Rationale**: This is a utility-focused clinical workflow tool requiring efficiency, data density, and professional trustworthiness. Material Design 3's form components, clear visual hierarchy, and emphasis on functionality make it ideal for medical applications. We'll adapt it with clinical-appropriate restraint.

---

## Typography System

**Font Stack**: 
- Primary: Inter (via Google Fonts CDN)
- Monospace: JetBrains Mono (for exam IDs, timestamps)

**Hierarchy**:
- Page Headers: text-2xl font-semibold (Patient intake, Exam systems)
- Section Headers: text-lg font-medium (Body system names)
- Form Labels: text-sm font-medium 
- Input Text: text-base font-normal
- Helper Text: text-xs font-normal
- Report Output: text-sm font-normal leading-relaxed

---

## Layout & Spacing System

**Spacing Units**: Tailwind units of 2, 4, 6, and 8
- Component padding: p-4 or p-6
- Section gaps: gap-6 or gap-8
- Form field spacing: space-y-4
- Card margins: m-2 or m-4

**Container Strategy**:
- Max-width: max-w-4xl (optimized for form readability, not ultra-wide)
- Centered layout: mx-auto
- Side padding: px-4 md:px-6

---

## Component Library

### Navigation
- **Top App Bar**: Fixed header with app name, patient context (when in exam), save status indicator
- **Progress Stepper**: Horizontal stepper showing: 1) Patient Info → 2) Physical Exam → 3) Report Review
- **System Navigation**: Vertical list/accordion of body systems with completion checkmarks

### Forms & Inputs
- **Text Inputs**: Material-style outlined inputs with floating labels
- **Toggle Buttons**: Large, clear Normal/Abnormal toggle groups (button group pattern)
- **Severity Selector**: Chip-style selection (Mild | Moderate | Severe)
- **Checkboxes**: Material checkboxes with clear touch targets (min 44px)
- **Text Areas**: Multi-line for free-text notes, auto-expanding
- **Date/Time Pickers**: Native browser inputs with fallback

### Cards & Containers
- **System Cards**: Elevated cards (shadow-md) with expandable sections
  - Collapsed: System name + Normal/Abnormal status + completion indicator
  - Expanded: All assessment fields visible
- **Patient Info Card**: Prominent card showing signalment at top of exam flow
- **Report Preview**: Full-width card with monospace formatting for generated text

### Data Display
- **Progress Indicator**: Visual completion bar (X/12 systems complete)
- **Status Badges**: Pills showing exam status (Draft, Complete, Archived)
- **Exam History List**: Table/list view with patient name, date, complaint, status
- **Vital Signs Grid**: 2-3 column grid layout for TPR, weight, BCS display

### Actions & Buttons
- **Primary Actions**: Solid buttons (Next, Generate Report, Save Exam)
- **Secondary Actions**: Outlined buttons (Cancel, Back, Edit)
- **Tertiary Actions**: Text buttons (Skip system, View previous exam)
- **Icon Buttons**: For expand/collapse, edit, delete in lists
- **Floating Action Button**: Quick "Save & Exit" accessible throughout exam

### Overlays & Feedback
- **Toast Notifications**: Bottom-center for save confirmations, errors
- **Modal Dialogs**: For confirmation actions (Delete exam, Discard changes)
- **Loading States**: Skeleton screens for exam loading, spinners for report generation
- **Empty States**: Helpful prompts when no exams exist ("Start your first exam")

---

## Page-Specific Layouts

### Patient Intake Screen
- Single column form (max-w-2xl)
- Logical grouping: Patient Details | Client Info | Visit Context
- Each group in a card with 2-column responsive grid (grid-cols-1 md:grid-cols-2)

### Physical Exam Flow
- Left sidebar: System navigation list (hidden on mobile, drawer pattern)
- Main content: Active system card with full assessment fields
- Bottom bar: Progress + Previous/Next navigation

### Report Generation Screen
- Split view (desktop): Form fields on left, live preview on right
- Mobile: Tabbed interface (Edit | Preview)
- Action bar: Copy to Clipboard | Download PDF | Save & Start New

### Exam History/Dashboard
- Search/filter bar at top
- Table view (desktop): Columns for Date, Patient, Species, Complaint, Actions
- Card view (mobile): Stack cards with key info
- Quick actions: View Report, Continue Editing, Duplicate

---

## Interaction Patterns

### System Assessment Flow
1. System defaults to collapsed with "Mark as Normal" quick action
2. Clicking "Abnormal" expands to show all assessment fields
3. Auto-save exam state every 30 seconds (with visual indicator)
4. Can navigate freely between systems without losing data

### Report Generation
- Real-time preview updates as fields are modified
- One-click copy with visual confirmation (checkmark animation)
- PDF downloads with patient name in filename

---

## Key Design Principles

1. **Clinical Efficiency**: Minimize clicks, support keyboard navigation, default to most common values
2. **Information Density**: Pack data without clutter - use progressive disclosure
3. **Professional Trust**: Clean, medical-grade aesthetic - no playful illustrations
4. **Error Prevention**: Clear validation, confirmation dialogs for destructive actions
5. **Accessibility**: WCAG 2.1 AA compliance, screen reader support for all form fields

---

## Icon Library
**Heroicons** (outline style for most UI, solid for active states)

---

## Animation Guidelines
**Minimal, purposeful only**:
- Expand/collapse transitions: 200ms ease
- Toast slide-in: 300ms ease-out
- Button press feedback: subtle scale (0.98) on active
- NO scroll-triggered animations or decorative motion