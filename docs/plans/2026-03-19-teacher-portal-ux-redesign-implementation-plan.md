# Teacher Portal UX Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the teacher portal UI to improve visual quality and make class-management workflows more intuitive without changing backend APIs.

**Architecture:** Keep the existing Next.js App Router structure and shadcn/ui component primitives. Improve UX by restructuring composition, adding semantic status indicators, stronger empty states, and action-first screen hierarchy.

**Tech Stack:** Next.js 16, React, TypeScript, TailwindCSS, shadcn/ui.

---

### Task 1: Establish shared visual shell and page rhythm

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/app/globals.css`

**Step 1: Implement app-shell wrapper with consistent content width and top context area**
- Add a top bar container and centered content max-width.
- Keep auth guard logic unchanged.

**Step 2: Add subtle global background styling and semantic helper classes**
- Introduce light gradient background and utility classes for info/success/warn panels.

**Step 3: Verify app pages still render**
Run: `npm run lint`
Expected: no new lint errors.

### Task 2: Redesign dashboard as action-first landing

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

**Step 1: Add hero section and KPI summary cards**
- Show count of classes and high-level progress cue.

**Step 2: Improve create-class flow UX copy and metadata display**
- Better placeholders, helper text, and card readability.

**Step 3: Add stronger empty state CTA**
- Keep quick “Tạo lớp” path visible with explanatory note.

### Task 3: Redesign class detail frame and task navigation

**Files:**
- Modify: `src/app/(app)/classes/[id]/page.tsx`

**Step 1: Improve header context and descriptions**
- Add concise guidance text for tab usage.

**Step 2: Improve tabs visual hierarchy**
- Use full-width tab list and clearer labels.

### Task 4: Improve import students UX (3-step clarity)

**Files:**
- Modify: `src/features/students-import/StudentsImportPanel.tsx`

**Step 1: Add explicit steps and outcomes**
- Present three steps in clear sequence.

**Step 2: Improve feedback panels**
- Separate success, warning, and error states with clearer language.

**Step 3: Add note about downloaded account credentials**
- Inline caution/help note for teacher.

### Task 5: Improve attendance UX for speed and legibility

**Files:**
- Modify: `src/features/attendance/AttendancePanel.tsx`

**Step 1: Highlight session creation status and active session details**
- Surface selected date/mode summary.

**Step 2: Add quick defaults and clearer status visuals**
- Keep default present behavior explicit and legible.

**Step 3: Use success/error feedback language consistently**
- Separate success message tone from failure states.

### Task 6: Improve gradebook readability and history clarity

**Files:**
- Modify: `src/features/grades/GradesPanel.tsx`

**Step 1: Add legend and threshold emphasis**
- Show what low score color means.

**Step 2: Improve student selection and history readability**
- Replace type id display in history with type name.

**Step 3: Improve table readability with stronger row/column cues**
- Keep low-score highlight but make neutral cells easier to scan.

### Task 7: Verify and finalize

**Files:**
- Modify (if needed): any touched files

**Step 1: Run lint and build**
Run: `npm run lint && npm run build`
Expected: successful checks.

**Step 2: Smoke-test key flows**
- Register/Login
- Create class
- Import CSV preview/confirm
- Create session and attendance
- Upsert grades and view history

**Step 3: Commit and deploy**
- Commit with focused message.
- Push to main for Vercel auto-deploy.
