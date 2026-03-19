# Teacher Portal v2 (Design)

> Focus: correct workflow (class wizard, students CRUD, sessions from schedule) + polished UI with dark mode.

## Screens

### Dashboard
- Lists classes
- Primary CTA: Create class (wizard)

### Create Class (Wizard)
1. Class info
2. Schedule slots (advanced)
3. Import students CSV (required step in wizard; can skip with "No students yet" but recommended)

### Class Detail
Tabs:
- Students
- Sessions
- Grades

#### Students tab
- Table list + search
- Bulk select → bulk delete
- Add student (manual)
- Edit student
- CSV append (preview/confirm)

#### Sessions tab
- Create session from schedule slot (select slot + date)
- Attendance for session
- Session note
- Create assessments in session and enter grades

## UI/Theme
- shadcn tokens; dark mode toggle persisted via localStorage
- Stronger visual hierarchy and semantic states
