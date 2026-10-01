import { useEffect, useState } from 'preact/hooks';
import { api, type ExamListItem } from '../api';
import { formatDate, plural, subjectIcon } from '../util';

export function HistoryPage() {
  const [exams, setExams] = useState<ExamListItem[] | null>(null);
  const [subject, setSubject] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listExams('done')
      .then(setExams)
      .catch((e) => setError(e.message));
  }, []);

  const subjects = [...new Set((exams ?? []).map((e) => e.subject))].sort();
  const visible = (exams ?? []).filter((e) => !subject || e.subject === subject);
  const count = exams?.length ?? 0;

  return (
    <div>
      <h1>Zaliczone ✅</h1>
      {error && <p class="error">{error}</p>}
      {exams === null && !error && <p class="muted">Ładowanie…</p>}
      {exams?.length === 0 && (
        <div class="card empty">
          <div class="big-emoji">📒</div>
          <p>Tu pojawią się sprawdziany, które już są za Tobą.</p>
        </div>
      )}

      {count > 0 && (
        <p class="muted">
          Masz już za sobą {count} {plural(count, 'sprawdzian', 'sprawdziany', 'sprawdzianów')}. Brawo! 🎉
        </p>
      )}

      {subjects.length > 1 && (
        <div class="chips">
          <button class={`chip ${subject === '' ? 'selected' : ''}`} onClick={() => setSubject('')}>
            Wszystkie
          </button>
          {subjects.map((s) => (
            <button key={s} class={`chip ${subject === s ? 'selected' : ''}`} onClick={() => setSubject(s)}>
              {subjectIcon(s)} {s}
            </button>
          ))}
        </div>
      )}

      <div class="exam-list">
        {visible.map((exam) => (
          <a key={exam.id} href={`#/sprawdzian/${exam.id}`} class="card exam-card">
            <div class="exam-icon">{subjectIcon(exam.subject)}</div>
            <div class="exam-main">
              <div class="exam-subject">{exam.subject}</div>
              <div class="exam-title">{exam.title}</div>
              <div class="muted small">{formatDate(exam.examDate)}</div>
              {exam.resultNote && <div class="small">💬 {exam.resultNote}</div>}
            </div>
            <div class="badge done">✅</div>
          </a>
        ))}
      </div>
    </div>
  );
}
