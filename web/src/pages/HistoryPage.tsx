import { useEffect, useState } from 'preact/hooks';
import { api, type ExamListItem } from '../api';
import { formatDate, gradeColor, gradeValue, subjectIcon } from '../util';

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

  const averages = subjects
    .map((s) => {
      const grades = (exams ?? []).filter((e) => e.subject === s && e.grade).map((e) => gradeValue(e.grade!));
      return { subject: s, count: grades.length, avg: grades.reduce((a, b) => a + b, 0) / (grades.length || 1) };
    })
    .filter((a) => a.count > 0);

  return (
    <div>
      <h1>Moje oceny ⭐</h1>
      {error && <p class="error">{error}</p>}
      {exams === null && !error && <p class="muted">Ładowanie…</p>}
      {exams?.length === 0 && (
        <div class="card empty">
          <div class="big-emoji">📒</div>
          <p>Tu pojawią się sprawdziany, które już są za Tobą.</p>
        </div>
      )}

      {averages.length > 0 && (
        <section class="card">
          <h2>Średnie</h2>
          <div class="averages">
            {averages.map((a) => (
              <div key={a.subject} class="average">
                <span>
                  {subjectIcon(a.subject)} {a.subject}
                </span>
                <b>{a.avg.toFixed(2)}</b>
              </div>
            ))}
          </div>
          <p class="muted small">Średnia jest orientacyjna (bez wag ocen).</p>
        </section>
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
            </div>
            {exam.grade ? (
              <div class="grade-badge" style={{ background: gradeColor(exam.grade) }}>
                {exam.grade}
              </div>
            ) : (
              <div class="badge">Brak oceny</div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
