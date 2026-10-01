import { useEffect, useRef, useState } from 'preact/hooks';
import { api, type User } from '../api';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: { client_id: string; callback: (response: { credential: string }) => void }): void;
          renderButton(element: HTMLElement, options: Record<string, unknown>): void;
        };
      };
    };
  }
}

function waitForGoogle(): Promise<NonNullable<Window['google']>> {
  return new Promise((resolve) => {
    const check = () => (window.google ? resolve(window.google) : setTimeout(check, 100));
    check();
  });
}

export function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.config(), waitForGoogle()]).then(([config, google]) => {
      if (cancelled || !buttonRef.current) return;
      google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: async ({ credential }) => {
          setError('');
          try {
            onLogin(await api.loginWithGoogle(credential));
          } catch (e) {
            setError((e as Error).message);
          }
        },
      });
      google.accounts.id.renderButton(buttonRef.current, {
        theme: 'filled_blue',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        locale: 'pl',
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div class="login">
      <div class="card login-card">
        <div class="login-emoji">🎒</div>
        <h1>Szkolny Pomocnik</h1>
        <p class="muted">Pilnuje sprawdzianów i pomaga się do nich przygotować.</p>
        <div ref={buttonRef} class="google-button" />
        {error && <p class="error">{error}</p>}
      </div>
    </div>
  );
}
