# Teacher Portal UX Redesign (PA2) Design

## Problem Statement
Current UI works functionally but feels sparse, with weak visual hierarchy and unclear action flow for teachers. Users can complete tasks, but they need too much mental effort to identify what to do next.

## Goals
- Make key tasks obvious: create class, import students, attendance, and grade entry.
- Improve visual quality with clearer color semantics and spacing rhythm.
- Reduce friction for first-time teachers via in-context guidance and better empty states.

## Non-Goals
- No backend schema/API redesign.
- No analytics dashboards or advanced global navigation beyond current scope.

## UX Principles
1. One primary action per screen section.
2. Action-first layout (what to do now appears before dense data tables).
3. Strong state communication (loading, empty, error, success).
4. Consistent semantic colors: info, success, warning, destructive.
5. Progressive disclosure for advanced fields.

## Information Architecture
- App shell: lightweight top bar with clear branding and persistent context.
- Dashboard:
  - Hero summary + KPI cards.
  - Primary CTA for class creation.
  - Class cards with metadata chips and quick links.
- Class detail:
  - Header with class context and note.
  - Task-oriented tabs with better spacing and descriptions.
- Students import:
  - 3-step guidance (template -> preview -> confirm).
  - Separate valid rows and errors; emphasize remediation.
- Attendance:
  - Session setup card first.
  - Attendance board second, with quick status controls and clear save feedback.
- Grades:
  - Legend and threshold visibility.
  - Cleaner gradebook readability with sticky student column and stronger low-score cues.
  - Student history area with friendlier labels.

## UI Tokens & Visual Direction
- Keep shadcn base components; adjust via layout classes and semantic accents.
- Increase color contrast in headers and badges.
- Use subtle gradients/background surfaces to remove flat feel.
- Keep typography simple: larger section headings, concise helper text.

## UX Notes to Add Inline
- Explain expected user outcome under each primary button.
- Include short “what to do if empty” notes in empty states.
- Show warning note where imported account credentials are downloaded.

## Risks and Mitigations
- Risk: too many visual changes reduce consistency.
  - Mitigation: keep component library primitives; only adjust composition and classes.
- Risk: introducing complexity in one pass.
  - Mitigation: iterative rollout by screen (dashboard -> class detail -> each panel).
