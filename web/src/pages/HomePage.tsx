import { useEffect, useState } from 'preact/hooks';
import { api, type ExamListItem, type User } from '../api';
import { daysLabel, daysUntil, formatDate, plural, subjectIcon, tasksForToday } from '../util';

export function HomePage({ user }: { user: User }) {
  const [exams, setExams] = useState<ExamListItem[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listExams('upcoming')
      .then(setExams)
      .catch((e) => setError(e.message));
  }, []);

  const todo = (exams ?? [])
    .map((exam) => {
      const days = daysUntil(exam.examDate);
      const remaining = exam.tasksTotal - exam.tasksDone;
      return { exam, days, count: days >= 0 ? tasksForToday(remaining, days) : 0 };
    })
    .filter((t) => t.count > 0);

  return (
    <div>
      <h1>Cześć{user.name ? `, ${user.name}` : ''}! 👋</h1>

      {todo.length > 0 && (
        <section class="card today">
          <h2>📅 Na dziś</h2>
          <ul>
            {todo.map(({ exam, count }) => (
              <li key={exam.id}>
                <a href={`#/sprawdzian/${exam.id}`}>
                  {subjectIcon(exam.subject)} <b>{exam.subject}</b>: zrób {count}{' '}
                  {plural(count, 'punkt', 'punkty', 'punktów')} z planu nauki
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div class="row-between">
        <h2>Nadchodzące sprawdziany</h2>
        <a href="#/nowy" class="button">
          + Dodaj
        </a>
      </div>

      {error && <p class="error">{error}</p>}
      {exams === null && !error && <p class="muted">Ładowanie…</p>}
      {exams?.length === 0 && (
        <div class="card empty">
          <div class="big-emoji">🌈</div>
          <p>Nie ma żadnych sprawdzianów. Hura!</p>
          <p class="muted">Gdy pani zapowie sprawdzian, kliknij „Dodaj”.</p>
        </div>
      )}

      <div class="exam-list">
        {exams?.map((exam) => {
          const days = daysUntil(exam.examDate);
          const progress = exam.tasksTotal ? Math.round((exam.tasksDone / exam.tasksTotal) * 100) : 0;
          const urgency = days < 0 ? 'past' : days <= 1 ? 'urgent' : days <= 3 ? 'soon' : '';
          return (
            <a key={exam.id} href={`#/sprawdzian/${exam.id}`} class="card exam-card">
              <div class="exam-icon">{subjectIcon(exam.subject)}</div>
              <div class="exam-main">
                <div class="exam-subject">{exam.subject}</div>
                <div class="exam-title">{exam.title}</div>
                <div class="muted small">{formatDate(exam.examDate)}</div>
                {exam.quizPaused && <div class="paused small">⏸ Przerwany test – kliknij, aby dokończyć</div>}
                {exam.tasksTotal > 0 && (
                  <div class="progress" title={`${exam.tasksDone} z ${exam.tasksTotal}`}>
                    <div class="progress-bar" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
              <div class={`badge ${urgency}`}>{days < 0 ? 'Jak poszło?' : daysLabel(days)}</div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
