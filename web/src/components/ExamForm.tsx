import { useState } from 'preact/hooks';
import type { ExamInput } from '../api';
import { SUBJECTS, todayIso } from '../util';

interface Props {
  initial?: ExamInput;
  submitLabel: string;
  onSubmit: (input: ExamInput) => Promise<void>;
  onCancel?: () => void;
}

export function ExamForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [subject, setSubject] = useState(initial?.subject ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [examDate, setExamDate] = useState(initial?.examDate ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: Event) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit({ subject, title, examDate, description });
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <form class="form" onSubmit={submit}>
      <label>
        Przedmiot
        <input
          list="subjects"
          value={subject}
          onInput={(e) => setSubject(e.currentTarget.value)}
          placeholder="np. Matematyka"
          required
        />
        <datalist id="subjects">
          {Object.keys(SUBJECTS).map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      <label>
        Z czego jest sprawdzian?
        <input
          value={title}
          onInput={(e) => setTitle(e.currentTarget.value)}
          placeholder="np. Ułamki zwykłe"
          required
        />
      </label>
      <label>
        Kiedy?
        <input
          type="date"
          value={examDate}
          min={initial ? undefined : todayIso()}
          onInput={(e) => setExamDate(e.currentTarget.value)}
          required
        />
      </label>
      <label>
        Co trzeba umieć? <span class="muted">(np. strony w podręczniku, zadania)</span>
        <textarea
          rows={4}
          value={description}
          onInput={(e) => setDescription(e.currentTarget.value)}
          placeholder="np. Podręcznik str. 40–52, zeszyt ćwiczeń zad. 1–8"
        />
      </label>
      {error && <p class="error">{error}</p>}
      <div class="row">
        <button type="submit" disabled={saving}>
          {saving ? 'Zapisuję…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" class="secondary" onClick={onCancel}>
            Anuluj
          </button>
        )}
      </div>
    </form>
  );
}
