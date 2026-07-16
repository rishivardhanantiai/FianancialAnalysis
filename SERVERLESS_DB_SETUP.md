# Serverless DB Setup (Supabase)

This project now stores transactions in Supabase through server-side API routes.

## 1) Create Supabase project

1. Go to Supabase and create a new project.
2. Open SQL Editor and run [supabase/transactions.sql](supabase/transactions.sql).

## 2) Configure environment variables

Update [.env](.env):

- `SUPABASE_URL` = your project URL
- `SUPABASE_SERVICE_ROLE_KEY` = your service role key

Important:
- Never expose service role keys in frontend code.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.

## 3) Start app

Run:

```bash
npm run dev
```

## 4) Verify

1. Open the app.
2. Add a transaction from Daily Log.
3. Refresh browser and verify data persists.
4. Open the app on another system and verify same records are visible.

## Notes

- API endpoints used:
  - `GET /api/transactions`
  - `POST /api/transactions`
  - `DELETE /api/transactions/:id`
- If env vars are missing, API returns an error and UI shows a sync warning.
