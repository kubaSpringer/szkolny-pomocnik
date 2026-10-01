# 🎒 Szkolny Pomocnik

A small app for a 4th-grade student. It keeps a list of the next exams (sprawdziany), helps to prepare for them, and keeps the history of passed exams with grades. The UI is in Polish.

## Features

- **Google login.** Only the e-mails in `ALLOWED_EMAILS` can log in.
- **Upcoming exams.** Each exam shows a countdown ("Jutro", "Za 3 dni") and a progress bar.
- **"Na dziś" box.** It tells how many study-plan steps to do today, so that all steps are done before the exam day.
- **Plan nauki.** A checklist of small study steps for each exam.
- **Fiszki + quiz.** You add questions and answers. In the quiz, cards that you do not know come back later.
- **Moje oceny.** Passed exams with grades (1–6 with +/-), a subject filter, and an approximate average.

## Stack

- `server/`: Node 22, Express 5, TypeScript, `pg`, `zod`. Login uses Google Identity Services. The server verifies the Google ID token and sets a JWT in an httpOnly cookie.
- `web/`: Preact + Vite (about 12 KB gzip).
- Postgres. The tables are created automatically at server start (`server/src/db.ts`).
- In production, one Node process serves both the API (`/api/*`) and the built frontend.

## 1. Create a Google OAuth client

1. Open <https://console.cloud.google.com/apis/credentials> and create a project.
2. Configure the **OAuth consent screen**: External, add the app name and your e-mail. You can stay in "Testing" mode. If you do, add each Gmail account as a **test user**.
3. Click **Create credentials → OAuth client ID → Web application**.
4. In **Authorized JavaScript origins**, add:
   - `http://localhost` and `http://localhost:5173` (for local development)
   - `https://<your-app>.onrender.com` (add this after the first deploy)
5. Copy the **Client ID**. You do not need the client secret.

## 2. Run locally

```bash
createdb szkolny_pomocnik
cp .env.example .env        # then set GOOGLE_CLIENT_ID and ALLOWED_EMAILS
yarn install
yarn dev                    # API on :3000, web on http://localhost:5173
```

## 3. Deploy to Render

1. Push this repo to GitHub.
2. On Render, click **New → Blueprint** and select the repo. Render reads `render.yaml` and creates:
   - the web service `szkolny-pomocnik`
   - the Postgres database `szkolny-pomocnik-db`
3. Render asks for 2 values:
   - `GOOGLE_CLIENT_ID`: the Client ID from step 1
   - `ALLOWED_EMAILS`: for example `corka@gmail.com,rodzic@gmail.com`
4. After the deploy, add the `https://<your-app>.onrender.com` URL to **Authorized JavaScript origins** in Google Cloud.

`SESSION_SECRET` is generated automatically.

### Costs and plans

- The web service is on the **free** plan. It sleeps after 15 minutes without traffic. The first visit after sleep takes about 30–60 s.
- The database is on **basic-256mb** (about $6/month). A **free** Render Postgres is deleted after 30 days, and then the exam history is lost. Change `plan:` in `render.yaml` only if you accept this.

## Data model

| Table        | What it stores                                                        |
| ------------ | --------------------------------------------------------------------- |
| `users`      | Google account (`google_sub`, e-mail, name)                           |
| `exams`      | subject, title, date, description, status `upcoming`/`done`, grade, note |
| `prep_tasks` | study-plan steps for each exam                                        |
| `flashcards` | question/answer pairs for each exam                                   |

Each user sees only their own exams.
