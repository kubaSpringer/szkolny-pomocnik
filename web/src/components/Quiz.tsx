import { useEffect, useRef, useState } from 'preact/hooks';
import type { Flashcard } from '../api';
import { isCorrect, isMathAnswer, keyboardFor } from '../answers';

/**
 * input:   she types the answer
 * correct: the answer matches
 * wrong:   a math answer does not match (checked automatically)
 * review:  a text answer does not match exactly; she decides if it was right
 * unknown: she clicked "Nie wiem"
 */
type Phase = 'input' | 'correct' | 'wrong' | 'review' | 'unknown';

const ROUND_SIZE = 10;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const inputRef = useRef<HTMLInputElement>(null);

  const current = round[index];

  useEffect(() => {
    if (phase === 'input') inputRef.current?.focus();
  }, [index, phase, round]);

  const start = (next: Flashcard[], retake: boolean) => {
    setRound(shuffle(next));
    setIndex(0);
    setFailed([]);
    setIsRetake(retake);
    setTyped('');
    setPhase('input');
  };

  const record = (correct: boolean) => {
    if (!correct) setFailed((f) => [...f, current]);
    setIndex((i) => i + 1);
    setTyped('');
    setPhase('input');
  };

  const check = (e: Event) => {
    e.preventDefault();
    if (!typed.trim()) return;
    if (isCorrect(typed, current.answer)) setPhase('correct');
    else setPhase(isMathAnswer(current.answer) ? 'wrong' : 'review');
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
                  {/=\s*\?\s*$/.test(card.question) ? (
                    <>
                      {card.question.replace(/\s*=\s*\?\s*$/, '')} = <b>{card.answer}</b>
                    </>
                  ) : (
                    <>
                      {card.question} → <b>{card.answer}</b>
                    </>
                  )}
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

      {phase === 'input' && (
        <form class="quiz-type" onSubmit={check}>
          <input
            ref={inputRef}
            class={keyboardFor(current.answer) === 'text' ? 'wide' : ''}
            inputMode={keyboardFor(current.answer)}
            autoComplete="off"
            autoCapitalize="off"
            spellcheck={false}
            value={typed}
            onInput={(e) => setTyped(e.currentTarget.value)}
            placeholder="Twoja odpowiedź"
          />
          <div class="row center-row">
            <button type="submit" disabled={!typed.trim()}>
              Sprawdź
            </button>
            <button type="button" class="secondary" onClick={() => setPhase('unknown')}>
              Nie wiem
            </button>
          </div>
        </form>
      )}

      {phase === 'correct' && <div class="quiz-answer">✅ Dobrze! {current.answer}</div>}
      {phase === 'wrong' && (
        <div class="quiz-answer wrong">
          Prawie! Twoja odpowiedź: {typed}
          <br />
          Poprawna odpowiedź: <b>{current.answer}</b>
        </div>
      )}
      {phase === 'unknown' && (
        <div class="quiz-answer wrong">
          Poprawna odpowiedź: <b>{current.answer}</b>
        </div>
      )}
      {(phase === 'correct' || phase === 'wrong' || phase === 'unknown') && (
        <div class="row center-row">
          <button autoFocus onClick={() => record(phase === 'correct')}>
            Dalej →
          </button>
        </div>
      )}

      {phase === 'review' && (
        <>
          <div class="quiz-review">
            <div>
              Twoja odpowiedź: <b>{typed}</b>
            </div>
            <div>
              Poprawna odpowiedź: <b>{current.answer}</b>
            </div>
          </div>
          <p class="muted small">Czy to znaczy to samo?</p>
          <div class="row center-row">
            <button class="good" onClick={() => record(true)}>
              ✅ Miałam dobrze
            </button>
            <button class="bad" onClick={() => record(false)}>
              ❌ Pomyłka
            </button>
          </div>
        </>
      )}
    </div>
  );
}
