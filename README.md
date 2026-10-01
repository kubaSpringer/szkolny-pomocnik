# 🎒 Szkolny Pomocnik

A small app for a 4th-grade student. It keeps a list of the next exams (sprawdziany), helps to prepare for them, and keeps the list of passed exams. The UI is in Polish.

## Features

- **Google login.** Only the e-mails in `ALLOWED_EMAILS` can log in.
- **Upcoming exams.** Each exam shows a countdown ("Jutro", "Za 3 dni") and a progress bar.
- **"Na dziś" box.** It tells how many study-plan steps to do today, so that all steps are done before the exam day.
- **Plan nauki.** A checklist of small study steps for each exam.
- **Fiszki + "Sprawdź się".** Each round asks 10 random cards, one time each. If the answer is a number, she types it and the app checks it. At the end, the app shows the % of correct answers, and she can repeat only the wrong questions.
- **Starter exam.** Each new user gets "Matematyka – Tabliczka mnożenia" (8 study steps, 100 cards from 1 × 1 to 10 × 10), with the date 14 days from the first login. See `server/src/starterExams.ts`.
- **Zaliczone.** The list of passed exams, with a note and a filter by subject.

## Stack

- `server/`: Node 22, Express 5, TypeScript, `pg`, `zod`. Login uses Google Identity Services. The server verifies the Google ID token and sets a JWT in an httpOnly cookie.
- `web/`: Preact + Vite (about 12 KB gzip).
- Postgres on [Neon](https://neon.tech) (free plan). The tables are created automatically at server start (`server/src/db.ts`).
- Hosting on [Render](https://render.com) (free web service).
- In production, one Node process serves both the API (`/api/*`) and the built frontend.

## 1. Create a Google OAuth client

1. Open <https://console.cloud.google.com/apis/credentials> and create a project.
2. Configure the **OAuth consent screen**: External, add the app name and your e-mail. You can stay in "Testing" mode. If you do, add each Gmail account as a **test user**.
3. Click **Create credentials → OAuth client ID → Web application**.
4. In **Authorized JavaScript origins**, add:
   - `http://localhost` and `http://localhost:5173` (for local development)
   - `https://<your-app>.onrender.com` (add this after the first deploy)
5. Copy the **Client ID**. You do not need the client secret.

## 2. Create the Neon database

1. Log in to <https://console.neon.tech> and open your project.
2. Use the region **AWS Europe Central 1 (Frankfurt)**. `render.yaml` puts the web service in Frankfurt too, so the two are close.
3. Click **Connect**. Select the **production** branch and the database `neondb`.
4. Copy the connection string. It looks like:
   `postgresql://neondb_owner:***@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
   Keep `?sslmode=require`. The app uses it to turn on SSL.

Optional: in Neon, create a branch `development` from `production`. Use its connection string in your local `.env`. Then local tests do not change the real data.

## 3. Run locally

```bash
cp .env.example .env        # set DATABASE_URL, GOOGLE_CLIENT_ID and ALLOWED_EMAILS
yarn install
yarn dev                    # API on :3000, web on http://localhost:5173
```

For `DATABASE_URL`, you can use a local Postgres (`createdb szkolny_pomocnik`) or a Neon branch.

## 4. Deploy to Render

1. Push this repo to GitHub.
2. On Render, click **New → Blueprint** and select the repo. Render reads `render.yaml` and creates the web service `szkolny-pomocnik`.
3. Render asks for 3 values:
   - `DATABASE_URL`: the Neon connection string from step 2
   - `GOOGLE_CLIENT_ID`: the Client ID from step 1
   - `ALLOWED_EMAILS`: for example `corka@gmail.com,rodzic@gmail.com`
4. After the deploy, add the `https://<your-app>.onrender.com` URL to **Authorized JavaScript origins** in Google Cloud.

`SESSION_SECRET` is generated automatically. At the first start, the server creates the tables in Neon.

### Costs and plans

- Render web service: **free** plan. It sleeps after 15 minutes without traffic. The first visit after sleep takes about 30–60 s.
- Neon: **free** plan. The database does not expire. The compute stops after about 5 minutes without queries, and the next query starts it again in less than 1 s.
- Total: **$0/month**.

### Backups

On the Neon free plan, you can restore data from a short time back only. For a full copy of the exam history, run from time to time:

```bash
pg_dump "$DATABASE_URL" > backup-$(date +%F).sql
```

## Data model

| Table        | What it stores                                                        |
| ------------ | --------------------------------------------------------------------- |
| `users`      | Google account (`google_sub`, e-mail, name), `seeded_at`              |
| `exams`      | subject, title, date, description, status `upcoming`/`done`, note     |
| `prep_tasks` | study-plan steps for each exam                                        |
| `flashcards` | question/answer pairs for each exam                                   |

Each user sees only their own exams.
