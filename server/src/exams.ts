import { Router, type Response } from 'express';
import { z } from 'zod';
import { pool } from './db';
import { requireAuth } from './auth';

export const examsRouter = Router();
examsRouter.use(requireAuth);

const examInput = z.object({
  subject: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(200),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(5000).default(''),
});

const EXAM_COLUMNS = `
  e.id, e.subject, e.title, e.exam_date AS "examDate", e.description, e.status,
  e.result_note AS "resultNote", e.finished_at AS "finishedAt"`;

function badRequest(res: Response, error: z.ZodError): void {
  res.status(400).json({ error: 'Niepoprawne dane.', details: error.flatten() });
}

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function ownsExam(userId: number, examId: number): Promise<boolean> {
  const { rowCount } = await pool.query('SELECT 1 FROM exams WHERE id = $1 AND user_id = $2', [examId, userId]);
  return rowCount === 1;
}

// ---------- Exams ----------

examsRouter.get('/exams', async (req, res) => {
  const status = req.query.status === 'done' ? 'done' : 'upcoming';
  const order = status === 'done' ? 'e.exam_date DESC' : 'e.exam_date ASC';
  const { rows } = await pool.query(
    `SELECT ${EXAM_COLUMNS},
       (SELECT count(*)::int FROM prep_tasks t WHERE t.exam_id = e.id) AS "tasksTotal",
       (SELECT count(*)::int FROM prep_tasks t WHERE t.exam_id = e.id AND t.done) AS "tasksDone",
       (SELECT count(*)::int FROM flashcards f WHERE f.exam_id = e.id) AS "flashcardsTotal",
       EXISTS (SELECT 1 FROM quiz_sessions q WHERE q.exam_id = e.id) AS "quizPaused"
     FROM exams e
     WHERE e.user_id = $1 AND e.status = $2
     ORDER BY ${order}, e.id`,
    [req.userId, status],
  );
  res.json(rows);
});

examsRouter.post('/exams', async (req, res) => {
  const parsed = examInput.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const { subject, title, examDate, description } = parsed.data;
  const { rows } = await pool.query(
    `INSERT INTO exams AS e (user_id, subject, title, exam_date, description)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${EXAM_COLUMNS}`,
    [req.userId, subject, title, examDate, description],
  );
  res.status(201).json(rows[0]);
});

examsRouter.get('/exams/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return void res.status(404).json({ error: 'Nie znaleziono.' });
  const { rows } = await pool.query(`SELECT ${EXAM_COLUMNS} FROM exams e WHERE e.id = $1 AND e.user_id = $2`, [
    id,
    req.userId,
  ]);
  if (!rows[0]) return void res.status(404).json({ error: 'Nie znaleziono sprawdzianu.' });

  const [tasks, flashcards, quizSession] = await Promise.all([
    pool.query('SELECT id, text, done FROM prep_tasks WHERE exam_id = $1 ORDER BY id', [id]),
    pool.query('SELECT id, question, answer FROM flashcards WHERE exam_id = $1 ORDER BY id', [id]),
    pool.query('SELECT state FROM quiz_sessions WHERE exam_id = $1', [id]),
  ]);
  res.json({
    ...rows[0],
    tasks: tasks.rows,
    flashcards: flashcards.rows,
    quizSession: quizSession.rows[0]?.state ?? null,
  });
});

examsRouter.patch('/exams/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const parsed = examInput.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const { subject, title, examDate, description } = parsed.data;
  const { rows } = await pool.query(
    `UPDATE exams AS e SET subject = $3, title = $4, exam_date = $5, description = $6
     WHERE e.id = $1 AND e.user_id = $2
     RETURNING ${EXAM_COLUMNS}`,
    [id, req.userId, subject, title, examDate, description],
  );
  if (!rows[0]) return void res.status(404).json({ error: 'Nie znaleziono sprawdzianu.' });
  res.json(rows[0]);
});

examsRouter.delete('/exams/:id', async (req, res) => {
  await pool.query('DELETE FROM exams WHERE id = $1 AND user_id = $2', [parseId(req.params.id), req.userId]);
  res.json({ ok: true });
});

const finishInput = z.object({
  resultNote: z.string().max(2000).default(''),
});

examsRouter.post('/exams/:id/finish', async (req, res) => {
  const parsed = finishInput.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const { rows } = await pool.query(
    `UPDATE exams AS e SET status = 'done', result_note = $3, finished_at = now()
     WHERE e.id = $1 AND e.user_id = $2
     RETURNING ${EXAM_COLUMNS}`,
    [parseId(req.params.id), req.userId, parsed.data.resultNote],
  );
  if (!rows[0]) return void res.status(404).json({ error: 'Nie znaleziono sprawdzianu.' });
  res.json(rows[0]);
});

examsRouter.post('/exams/:id/reopen', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE exams AS e SET status = 'upcoming', result_note = NULL, finished_at = NULL
     WHERE e.id = $1 AND e.user_id = $2
     RETURNING ${EXAM_COLUMNS}`,
    [parseId(req.params.id), req.userId],
  );
  if (!rows[0]) return void res.status(404).json({ error: 'Nie znaleziono sprawdzianu.' });
  res.json(rows[0]);
});

// ---------- Prep tasks (plan nauki) ----------

const taskInput = z.object({ text: z.string().trim().min(1).max(300) });

examsRouter.post('/exams/:id/tasks', async (req, res) => {
  const examId = parseId(req.params.id);
  const parsed = taskInput.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  if (!examId || !(await ownsExam(req.userId!, examId))) return void res.status(404).json({ error: 'Nie znaleziono.' });
  const { rows } = await pool.query('INSERT INTO prep_tasks (exam_id, text) VALUES ($1, $2) RETURNING id, text, done', [
    examId,
    parsed.data.text,
  ]);
  res.status(201).json(rows[0]);
});

const taskPatch = z.object({ done: z.boolean() });

examsRouter.patch('/tasks/:id', async (req, res) => {
  const parsed = taskPatch.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const { rows } = await pool.query(
    `UPDATE prep_tasks t SET done = $3
     FROM exams e
     WHERE t.id = $1 AND t.exam_id = e.id AND e.user_id = $2
     RETURNING t.id, t.text, t.done`,
    [parseId(req.params.id), req.userId, parsed.data.done],
  );
  if (!rows[0]) return void res.status(404).json({ error: 'Nie znaleziono.' });
  res.json(rows[0]);
});

examsRouter.delete('/tasks/:id', async (req, res) => {
  await pool.query('DELETE FROM prep_tasks t USING exams e WHERE t.id = $1 AND t.exam_id = e.id AND e.user_id = $2', [
    parseId(req.params.id),
    req.userId,
  ]);
  res.json({ ok: true });
});

// ---------- Flashcards (fiszki) ----------

const flashcardInput = z.object({
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(1000),
});

examsRouter.post('/exams/:id/flashcards', async (req, res) => {
  const examId = parseId(req.params.id);
  const parsed = flashcardInput.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  if (!examId || !(await ownsExam(req.userId!, examId))) return void res.status(404).json({ error: 'Nie znaleziono.' });
  const { rows } = await pool.query(
    'INSERT INTO flashcards (exam_id, question, answer) VALUES ($1, $2, $3) RETURNING id, question, answer',
    [examId, parsed.data.question, parsed.data.answer],
  );
  res.status(201).json(rows[0]);
});

examsRouter.delete('/flashcards/:id', async (req, res) => {
  await pool.query('DELETE FROM flashcards f USING exams e WHERE f.id = $1 AND f.exam_id = e.id AND e.user_id = $2', [
    parseId(req.params.id),
    req.userId,
  ]);
  res.json({ ok: true });
});

// ---------- Quiz session (unfinished "Sprawdź się" round) ----------

const cardIds = z.array(z.number().int().positive()).max(500);
const quizSessionInput = z.object({
  round: cardIds.min(1),
  index: z.number().int().min(0),
  failed: cardIds,
  isRetake: z.boolean(),
});

examsRouter.put('/exams/:id/quiz-session', async (req, res) => {
  const examId = parseId(req.params.id);
  const parsed = quizSessionInput.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  if (!examId || !(await ownsExam(req.userId!, examId))) return void res.status(404).json({ error: 'Nie znaleziono.' });
  await pool.query(
    `INSERT INTO quiz_sessions (exam_id, state) VALUES ($1, $2)
     ON CONFLICT (exam_id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()`,
    [examId, parsed.data],
  );
  res.json({ ok: true });
});

examsRouter.delete('/exams/:id/quiz-session', async (req, res) => {
  await pool.query('DELETE FROM quiz_sessions q USING exams e WHERE q.exam_id = $1 AND q.exam_id = e.id AND e.user_id = $2', [
    parseId(req.params.id),
    req.userId,
  ]);
  res.json({ ok: true });
});
