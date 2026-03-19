# Deploy Frontend (Vercel)

## Prerequisites

- Backend API deployed and reachable (FastAPI)

## Vercel setup

1. Import the repo `school-management-fe` into Vercel.
2. Set environment variables:
   - `NEXT_PUBLIC_API_BASE_URL` = your backend base URL (example: `https://your-api.example.com`)
3. Deploy.

## Notes

- The frontend sends `Authorization: Bearer <token>` to the backend.
- Ensure backend `CORS_ORIGINS` includes your Vercel domain.

