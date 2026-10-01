import { useState } from 'preact/hooks';
import type { Flashcard } from '../api';

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function Quiz({ cards, onClose }: { cards: Flashcard[]; onClose: () => void }) {
  const [queue, setQueue] = useState(() => shuffle(cards));
  const [showAnswer, setShowAnswer] = useState(false);
  const [known, setKnown] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const current = queue[0];

  const answer = (isKnown: boolean) => {
    setAttempts((a) => a + 1);
    setShowAnswer(false);
    if (isKnown) {
      setKnown((k) => k + 1);
      setQueue((q) => q.slice(1));
    } else {
      // Not known yet: put the card at the end and ask again later.
      setQueue((q) => [...q.slice(1), q[0]]);
    }
  };

  if (!current) {
    const perfect = attempts === cards.length;
    return (
      <div class="card quiz done">
        <div class="big-emoji">{perfect ? '🏆' : '🎉'}</div>
        <h2>Brawo! Umiesz wszystkie fiszki!</h2>
        <p class="muted">
          {perfect ? 'Wszystko za pierwszym razem. Mistrzostwo!' : `Odpowiedzi: ${attempts}. Następnym razem pójdzie jeszcze lepiej!`}
        </p>
        <div class="row center-row">
          <button
            onClick={() => {
              setQueue(shuffle(cards));
              setKnown(0);
              setAttempts(0);
            }}
          >
            Jeszcze raz
          </button>
          <button class="secondary" onClick={onClose}>
            Zakończ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="card quiz">
      <div class="row-between">
        <span class="muted small">
          Umiem: {known} / {cards.length}
        </span>
        <button class="link" onClick={onClose}>
          Zakończ
        </button>
      </div>
      <div class="quiz-question">{current.question}</div>
      {showAnswer ? (
        <>
          <div class="quiz-answer">{current.answer}</div>
          <div class="row center-row">
            <button class="good" onClick={() => answer(true)}>
              ✅ Umiem
            </button>
            <button class="bad" onClick={() => answer(false)}>
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
