import { Pool, types } from 'pg';

// Return DATE columns as plain 'YYYY-MM-DD' strings (no timezone shifts).
types.setTypeParser(1082, (value) => value);

// SSL comes from the connection string: Neon URLs carry `sslmode=require`, local URLs don't.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// Neon suspends idle compute and closes its connections. Without this handler,
// an error on an idle client would crash the process.
pool.on('error', (err) => {
  console.error('Idle database client error', err.message);
});

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  google_sub  TEXT NOT NULL UNIQUE,
  email       TEXT NOT NULL,
  name        TEXT,
  picture     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exams (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject      TEXT NOT NULL,
  title        TEXT NOT NULL,
  exam_date    DATE NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'done')),
  result_note  TEXT,
  finished_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exams_user_status_date_idx ON exams (user_id, status, exam_date);

CREATE TABLE IF NOT EXISTS prep_tasks (
  id          SERIAL PRIMARY KEY,
  exam_id     INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  done        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prep_tasks_exam_idx ON prep_tasks (exam_id);

CREATE TABLE IF NOT EXISTS flashcards (
  id          SERIAL PRIMARY KEY,
  exam_id     INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS flashcards_exam_idx ON flashcards (exam_id);

-- Grades were removed from the app.
ALTER TABLE exams DROP COLUMN IF EXISTS grade;

-- Set when the starter exams (see starterExams.ts) were added for the user.
ALTER TABLE users ADD COLUMN IF NOT EXISTS seeded_at TIMESTAMPTZ;
`;

export async function migrate(): Promise<void> {
  await pool.query(schema);
}
