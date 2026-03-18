# School Management — Frontend (Next.js)

Teacher portal for the class-based student management system.

## Stack

- Next.js (App Router)
- TailwindCSS
- shadcn/ui

## Local development

1. Install deps:

```bash
npm install
```

2. Create `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"
```

3. Run dev server:

```bash
npm run dev
```

## Scripts

- `npm run dev`
- `npm run lint`
- `npm run build`

## Deploy (Vercel)

- Set env var `NEXT_PUBLIC_API_BASE_URL` to your deployed backend base URL.
