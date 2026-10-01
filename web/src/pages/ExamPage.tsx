import { useEffect, useState } from 'preact/hooks';
import { api, type ExamDetails } from '../api';
import { ExamForm } from '../components/ExamForm';
import { Quiz } from '../components/Quiz';
import { navigate } from '../router';
import { GRADES, daysLabel, daysUntil, formatDate, gradeColor, randomCheer, subjectIcon } from '../util';

export function ExamPage({ id }: { id: number }) {
  const [exam, setExam] = useState<ExamDetails | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [quiz, setQuiz] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const load = () =>
    api
      .getExam(id)
      .then(setExam)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [id]);

  if (error) return <p class="error">{error}</p>;
  if (!exam) return <p class="muted">Ładowanie…</p>;

  const days = daysUntil(exam.examDate);
  const isDone = exam.status === 'done';

  const remove = async () => {
    if (!confirm('Na pewno usunąć ten sprawdzian?')) return;
    await api.deleteExam(exam.id);
    navigate(isDone ? '/historia' : '/');
  };

  return (
    <div>
      <a href={isDone ? '#/historia' : '#/'} class="back">
        ← Wróć
      </a>

      {editing ? (
        <div class="card">
          <h2>Edytuj sprawdzian</h2>
          <ExamForm
            initial={exam}
            submitLabel="Zapisz zmiany"
            onSubmit={async (input) => {
              await api.updateExam(exam.id, input);
              setEditing(false);
              await load();
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <div class="card exam-header">
          <div class="exam-header-top">
            <div class="exam-icon big">{subjectIcon(exam.subject)}</div>
            <div>
              <div class="exam-subject">{exam.subject}</div>
              <h1>{exam.title}</h1>
              <div class="muted">
                {formatDate(exam.examDate)}
                {!isDone && days >= 0 && <b> · {daysLabel(days)}</b>}
              </div>
            </div>
            {isDone && exam.grade && (
              <div class="grade-badge" style={{ background: gradeColor(exam.grade) }}>
                {exam.grade}
              </div>
            )}
          </div>
          {exam.description && <p class="description">{exam.description}</p>}
          {isDone && exam.resultNote && <p class="description">💬 {exam.resultNote}</p>}
          <div class="row">
            {!isDone && <button onClick={() => setFinishing(true)}>🏁 Sprawdzian za mną</button>}
            {isDone && (
              <button
                class="secondary"
                onClick={async () => {
                  await api.reopenExam(exam.id);
                  await load();
                }}
              >
                Przywróć do nadchodzących
              </button>
            )}
            <button class="secondary" onClick={() => setEditing(true)}>
              Edytuj
            </button>
            <button class="secondary danger" onClick={remove}>
              Usuń
            </button>
          </div>
        </div>
      )}

      {finishing && (
        <FinishForm
          onCancel={() => setFinishing(false)}
          onSave={async (grade, note) => {
            await api.finishExam(exam.id, grade, note);
            setFinishing(false);
            await load();
          }}
        />
      )}

      {quiz ? (
        <Quiz cards={exam.flashcards} onClose={() => setQuiz(false)} />
      ) : (
        <>
          <StudyPlan exam={exam} onChange={setExam} />
          <Flashcards exam={exam} onChange={setExam} onStartQuiz={() => setQuiz(true)} />
        </>
      )}
    </div>
  );
}

function FinishForm({
  onSave,
  onCancel,
}: {
  onSave: (grade: string | null, note: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [grade, setGrade] = useState<string | null>(null);
  const [note, setNote] = useState('');

  return (
    <div class="card finish">
      <h2>Jak poszło? 🤞</h2>
      <p class="muted">Wybierz ocenę. Jeśli jeszcze jej nie znasz, zostaw puste i wpisz później.</p>
      <div class="grades">
        {GRADES.map((g) => (
          <button
            key={g}
            type="button"
            class={`grade-choice ${grade === g ? 'selected' : ''}`}
            style={grade === g ? { background: gradeColor(g), borderColor: gradeColor(g) } : undefined}
            onClick={() => setGrade(grade === g ? null : g)}
          >
            {g}
          </button>
        ))}
      </div>
      <label class="form">
        Notatka (np. co było trudne)
        <textarea rows={2} value={note} onInput={(e) => setNote(e.currentTarget.value)} />
      </label>
      <div class="row">
        <button onClick={() => onSave(grade, note)}>Zapisz</button>
        <button class="secondary" onClick={onCancel}>
          Anuluj
        </button>
      </div>
    </div>
  );
}

function StudyPlan({ exam, onChange }: { exam: ExamDetails; onChange: (exam: ExamDetails) => void }) {
  const [text, setText] = useState('');
  const [cheer, setCheer] = useState('');
  const doneCount = exam.tasks.filter((t) => t.done).length;
  const allDone = exam.tasks.length > 0 && doneCount === exam.tasks.length;

  const add = async (e: Event) => {
    e.preventDefault();
    if (!text.trim()) return;
    const task = await api.addTask(exam.id, text);
    onChange({ ...exam, tasks: [...exam.tasks, task] });
    setText('');
  };

  const toggle = async (taskId: number, done: boolean) => {
    const updated = await api.setTaskDone(taskId, done);
    onChange({ ...exam, tasks: exam.tasks.map((t) => (t.id === taskId ? updated : t)) });
    if (done) setCheer(randomCheer());
  };

  const remove = async (taskId: number) => {
    await api.deleteTask(taskId);
    onChange({ ...exam, tasks: exam.tasks.filter((t) => t.id !== taskId) });
  };

  return (
    <section class="card">
      <div class="row-between">
        <h2>📝 Plan nauki</h2>
        {exam.tasks.length > 0 && (
          <span class="muted small">
            {doneCount} / {exam.tasks.length}
          </span>
        )}
      </div>
      {exam.tasks.length === 0 && (
        <p class="muted">Podziel naukę na małe kroki, np. „Przeczytać str. 40–45”, „Zrobić zad. 3”.</p>
      )}
      {allDone && <p class="success">🌟 Wszystko zrobione! Jesteś gotowa!</p>}
      {!allDone && cheer && <p class="success">{cheer}</p>}
      <ul class="tasks">
        {exam.tasks.map((task) => (
          <li key={task.id} class={task.done ? 'done' : ''}>
            <label>
              <input type="checkbox" checked={task.done} onChange={(e) => toggle(task.id, e.currentTarget.checked)} />
              <span>{task.text}</span>
            </label>
            <button class="icon" title="Usuń" onClick={() => remove(task.id)}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      <form class="inline-form" onSubmit={add}>
        <input value={text} onInput={(e) => setText(e.currentTarget.value)} placeholder="Nowy krok…" />
        <button type="submit">Dodaj</button>
      </form>
    </section>
  );
}

function Flashcards({
  exam,
  onChange,
  onStartQuiz,
}: {
  exam: ExamDetails;
  onChange: (exam: ExamDetails) => void;
  onStartQuiz: () => void;
}) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [open, setOpen] = useState(false);

  const add = async (e: Event) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    const card = await api.addFlashcard(exam.id, question, answer);
    onChange({ ...exam, flashcards: [...exam.flashcards, card] });
    setQuestion('');
    setAnswer('');
  };

  const remove = async (cardId: number) => {
    await api.deleteFlashcard(cardId);
    onChange({ ...exam, flashcards: exam.flashcards.filter((c) => c.id !== cardId) });
  };

  return (
    <section class="card">
      <div class="row-between">
        <h2>🃏 Fiszki</h2>
        {exam.flashcards.length > 0 && <button onClick={onStartQuiz}>▶ Sprawdź się</button>}
      </div>
      {exam.flashcards.length === 0 && (
        <p class="muted">Dodaj pytania i odpowiedzi. Potem sprawdź, ile już umiesz!</p>
      )}
      {exam.flashcards.length > 0 && (
        <button class="link" onClick={() => setOpen(!open)}>
          {open ? 'Ukryj fiszki' : `Pokaż fiszki (${exam.flashcards.length})`}
        </button>
      )}
      {open && (
        <ul class="flashcards">
          {exam.flashcards.map((card) => (
            <li key={card.id}>
              <div>
                <b>{card.question}</b>
                <div class="muted">{card.answer}</div>
              </div>
              <button class="icon" title="Usuń" onClick={() => remove(card.id)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <form class="form flashcard-form" onSubmit={add}>
        <input value={question} onInput={(e) => setQuestion(e.currentTarget.value)} placeholder="Pytanie, np. 7 × 8 = ?" />
        <input value={answer} onInput={(e) => setAnswer(e.currentTarget.value)} placeholder="Odpowiedź, np. 56" />
        <button type="submit">Dodaj fiszkę</button>
      </form>
    </section>
  );
}
