import { Router, type Request, type Response, type NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { pool } from './db';

const COOKIE_NAME = 'session';
const SESSION_DAYS = 30;

const googleClientId = process.env.GOOGLE_CLIENT_ID ?? '';
const sessionSecret = process.env.SESSION_SECRET ?? '';
const allowedEmails = (process.env.ALLOWED_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const googleClient = new OAuth2Client(googleClientId);

export interface User {
  id: number;
  email: string;
  name: string | null;
  picture: string | null;
}

declare module 'express-serve-static-core' {
  interface Request {
    userId?: number;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: 'Musisz się zalogować.' });
    return;
  }
  try {
    const payload = jwt.verify(token, sessionSecret) as { uid: number };
    req.userId = payload.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Sesja wygasła. Zaloguj się ponownie.' });
  }
}

export const authRouter = Router();

authRouter.get('/config', (_req, res) => {
  res.json({ googleClientId });
});

authRouter.post('/auth/google', async (req, res) => {
  const credential = req.body?.credential;
  if (typeof credential !== 'string') {
    res.status(400).json({ error: 'Brak danych logowania.' });
    return;
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: googleClientId });
    payload = ticket.getPayload();
  } catch {
    res.status(401).json({ error: 'Nie udało się zalogować przez Google.' });
    return;
  }
  if (!payload?.sub || !payload.email || !payload.email_verified) {
    res.status(401).json({ error: 'Konto Google nie ma potwierdzonego adresu e-mail.' });
    return;
  }

  const email = payload.email.toLowerCase();
  if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
    res.status(403).json({ error: 'To konto nie ma dostępu do aplikacji.' });
    return;
  }

  const { rows } = await pool.query<User>(
    `INSERT INTO users (google_sub, email, name, picture)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_sub) DO UPDATE
       SET email = EXCLUDED.email, name = EXCLUDED.name, picture = EXCLUDED.picture
     RETURNING id, email, name, picture`,
    [payload.sub, email, payload.given_name ?? payload.name ?? null, payload.picture ?? null],
  );
  const user = rows[0];

  const token = jwt.sign({ uid: user.id }, sessionSecret, { expiresIn: `${SESSION_DAYS}d` });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
  res.json(user);
});

authRouter.post('/auth/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query<User>('SELECT id, email, name, picture FROM users WHERE id = $1', [req.userId]);
  if (!rows[0]) {
    res.status(401).json({ error: 'Musisz się zalogować.' });
    return;
  }
  res.json(rows[0]);
});
