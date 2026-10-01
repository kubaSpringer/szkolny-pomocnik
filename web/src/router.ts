import { useEffect, useState } from 'preact/hooks';

export type Route =
  | { name: 'home' }
  | { name: 'new' }
  | { name: 'exam'; id: number }
  | { name: 'history' };

function parse(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  const examMatch = path.match(/^\/sprawdzian\/(\d+)$/);
  if (examMatch) return { name: 'exam', id: Number(examMatch[1]) };
  if (path === '/nowy') return { name: 'new' };
  if (path === '/historia') return { name: 'history' };
  return { name: 'home' };
}

export function navigate(path: string): void {
  window.location.hash = path;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parse(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
