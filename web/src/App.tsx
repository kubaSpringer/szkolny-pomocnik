import { useEffect, useState } from 'preact/hooks';
import { api, type User } from './api';
import { useRoute } from './router';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { NewExamPage } from './pages/NewExamPage';
import { ExamPage } from './pages/ExamPage';
import { HistoryPage } from './pages/HistoryPage';

export function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const route = useRoute();

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) return <div class="center muted">Ładowanie…</div>;
  if (user === null) return <LoginPage onLogin={setUser} />;

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return (
    <div class="layout">
      <header class="topbar">
        <a href="#/" class="logo">
          🎒 Szkolny Pomocnik
        </a>
        <nav>
          <a href="#/" class={route.name === 'home' ? 'active' : ''}>
            Sprawdziany
          </a>
          <a href="#/historia" class={route.name === 'history' ? 'active' : ''}>
            Moje oceny
          </a>
        </nav>
        <button class="link" onClick={logout} title={user.email}>
          Wyloguj
        </button>
      </header>
      <main>
        {route.name === 'home' && <HomePage user={user} />}
        {route.name === 'new' && <NewExamPage />}
        {route.name === 'exam' && <ExamPage id={route.id} />}
        {route.name === 'history' && <HistoryPage />}
      </main>
    </div>
  );
}
