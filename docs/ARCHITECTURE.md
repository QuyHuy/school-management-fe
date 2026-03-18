# Frontend Architecture (MVP)

## Pages

- `/(auth)/login` — teacher login
- `/(app)/dashboard` — list/create classes
- `/(app)/classes/[id]` — class detail tabs (students import, attendance, grades)

## API client

- `src/lib/api.ts` wraps `fetch` to backend `NEXT_PUBLIC_API_BASE_URL`
- Auth token is sent via `Authorization: Bearer <token>`

