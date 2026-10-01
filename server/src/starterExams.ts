import { pool } from './db';

const STARTER_DAYS_AHEAD = 14;

const multiplicationTable = {
  subject: 'Matematyka',
  title: 'Tabliczka mnożenia',
  description:
    'Cała tabliczka mnożenia do 10 × 10.\n' +
    'Ucz się po kolei: najpierw łatwe liczby (1, 2, 5, 10), potem trudniejsze.\n' +
    'Codziennie zrób jedną rundę „Sprawdź się”. Termin możesz zmienić przyciskiem „Edytuj”.',
  tasks: [
    'Powtórz mnożenie przez 1, 2, 5 i 10',
    'Naucz się mnożenia przez 3',
    'Naucz się mnożenia przez 4',
    'Naucz się mnożenia przez 6',
    'Naucz się mnożenia przez 7',
    'Naucz się mnożenia przez 8',
    'Naucz się mnożenia przez 9',
    'Zrób 3 rundy „Sprawdź się” bez pomyłki',
  ],
  flashcards: Array.from({ length: 10 }, (_, i) =>
    Array.from({ length: 10 }, (_, j) => ({ question: `${i + 1} × ${j + 1} = ?`, answer: String((i + 1) * (j + 1)) })),
  ).flat(),
};

/** Adds the starter exams once per user. Safe to call on every request. */
export async function ensureStarterExams(userId: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const claimed = await client.query('UPDATE users SET seeded_at = now() WHERE id = $1 AND seeded_at IS NULL', [
      userId,
    ]);
    if (claimed.rowCount !== 1) {
      await client.query('ROLLBACK');
      return;
    }

    const exam = multiplicationTable;
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO exams (user_id, subject, title, exam_date, description)
       VALUES ($1, $2, $3, CURRENT_DATE + $4::int, $5)
       RETURNING id`,
      [userId, exam.subject, exam.title, STARTER_DAYS_AHEAD, exam.description],
    );
    const examId = rows[0].id;
    await client.query('INSERT INTO prep_tasks (exam_id, text) SELECT $1, unnest($2::text[])', [examId, exam.tasks]);
    await client.query(
      'INSERT INTO flashcards (exam_id, question, answer) SELECT $1, unnest($2::text[]), unnest($3::text[])',
      [examId, exam.flashcards.map((c) => c.question), exam.flashcards.map((c) => c.answer)],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
