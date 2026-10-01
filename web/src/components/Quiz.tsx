import { useEffect, useRef, useState } from 'preact/hooks';
import type { Flashcard } from '../api';

const ROUND_SIZE = 10;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Cards with a number as the answer (e.g. "7 × 8 = ?") are answered by typing. */
function isNumeric(answer: string): boolean {
  return /^-?\d+([.,]\d+)?$/.test(answer.trim());
}

function normalize(value: string): string {
  return value.trim().replace(',', '.').replace(/^0+(?=\d)/, '');
}

function scoreMessage(percent: number): string {
  if (percent === 100) return 'Bez ani jednej pomyłki! Mistrzostwo! 🏆';
  if (percent >= 80) return 'Świetnie! Jeszcze trochę i będzie 100%! ⭐';
  if (percent >= 50) return 'Dobrze Ci idzie! Powtórz błędne pytania. 💪';
  return 'Nie poddawaj się! Powtórz błędne pytania. 🌱';
}

export function Quiz({ cards, onClose }: { cards: Flashcard[]; onClose: () => void }) {
  const [round, setRound] = useState(() => shuffle(cards).slice(0, ROUND_SIZE));
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Flashcard[]>([]);
  const [isRetake, setIsRetake] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [typed, setTyped] = useState('');
  const [checked, setChecked] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = round[index];
  const typing = current ? isNumeric(current.answer) : false;

  useEffect(() => {
    if (typing && checked === null) inputRef.current?.focus();
  }, [index, checked, round]);

  const start = (next: Flashcard[], retake: boolean) => {
    setRound(shuffle(next));
    setIndex(0);
    setFailed([]);
    setIsRetake(retake);
    setShowAnswer(false);
    setTyped('');
    setChecked(null);
  };

  const record = (correct: boolean) => {
    if (!correct) setFailed((f) => [...f, current]);
    setIndex((i) => i + 1);
    setShowAnswer(false);
    setTyped('');
    setChecked(null);
  };

  const check = (e: Event) => {
    e.preventDefault();
    if (!typed.trim()) return;
    setChecked(normalize(typed) === normalize(current.answer));
  };

  // ---------- Result screen ----------
  if (!current) {
    const correct = round.length - failed.length;
    const percent = Math.round((correct / round.length) * 100);
    return (
      <div class="card quiz">
        <div class="big-emoji">{percent === 100 ? '🏆' : percent >= 50 ? '🎉' : '💪'}</div>
        <div class={`score ${percent === 100 ? 'perfect' : percent >= 50 ? 'good' : 'low'}`}>{percent}%</div>
        <p>
          Dobre odpowiedzi: <b>{correct}</b> z <b>{round.length}</b>
        </p>
        <p class="muted">{scoreMessage(percent)}</p>

        {failed.length > 0 && (
          <div class="failed-list">
            <h3>Do powtórki:</h3>
            <ul>
              {failed.map((card) => (
                <li key={card.id}>
                  {card.question.replace(/\s*=\s*\?\s*$/, '')} = <b>{card.answer}</b>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div class="row center-row">
          {failed.length > 0 && <button onClick={() => start(failed, true)}>🔁 Powtórz błędne ({failed.length})</button>}
          <button class={failed.length > 0 ? 'secondary' : ''} onClick={() => start(shuffle(cards).slice(0, ROUND_SIZE), false)}>
            Nowa runda
          </button>
          <button class="secondary" onClick={onClose}>
            Zakończ
          </button>
        </div>
      </div>
    );
  }

  // ---------- Question screen ----------
  return (
    <div class="card quiz">
      <div class="row-between">
        <span class="muted small">
          {isRetake ? 'Powtórka · ' : ''}Pytanie {index + 1} z {round.length}
        </span>
        <button class="link" onClick={onClose}>
          Zakończ
        </button>
      </div>
      <div class="progress">
        <div class="progress-bar" style={{ width: `${(index / round.length) * 100}%` }} />
      </div>
      <div class="quiz-question">{current.question}</div>

      {typing ? (
        checked !== null ? (
          <>
            {checked ? (
              <div class="quiz-answer">✅ Dobrze! {current.answer}</div>
            ) : (
              <div class="quiz-answer wrong">
                Prawie! Poprawna odpowiedź: <b>{current.answer}</b>
              </div>
            )}
            <div class="row center-row">
              <button autoFocus onClick={() => record(checked)}>
                Dalej →
              </button>
            </div>
          </>
        ) : (
          <form class="quiz-type" onSubmit={check}>
            <input
              ref={inputRef}
              inputMode="numeric"
              autoComplete="off"
              value={typed}
              onInput={(e) => setTyped(e.currentTarget.value)}
              placeholder="?"
            />
            <button type="submit">Sprawdź</button>
          </form>
        )
      ) : showAnswer ? (
        <>
          <div class="quiz-answer">{current.answer}</div>
          <div class="row center-row">
            <button class="good" onClick={() => record(true)}>
              ✅ Umiem
            </button>
            <button class="bad" onClick={() => record(false)}>
              🔁 Jeszcze nie
            </button>
          </div>
        </>
      ) : (
        <div class="row center-row">
          <button onClick={() => setShowAnswer(true)}>Pokaż odpowiedź</button>
        </div>
      )}
    </div>
  );
}
