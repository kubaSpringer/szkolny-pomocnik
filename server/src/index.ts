import path from 'node:path';
import fs from 'node:fs';
import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import { migrate } from './db';
import { authRouter } from './auth';
import { examsRouter } from './exams';

for (const key of ['DATABASE_URL', 'GOOGLE_CLIENT_ID', 'SESSION_SECRET']) {
  if (!process.env[key]) throw new Error(`Missing env variable: ${key}`);
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});
app.use('/api', authRouter);
app.use('/api', examsRouter);
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Nie znaleziono.' });
});

// Serve the built frontend (web/dist) and let the SPA handle routing.
const webDist = path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Coś poszło nie tak. Spróbuj ponownie.' });
});

const port = Number(process.env.PORT ?? 3000);

migrate()
  .then(() => {
    app.listen(port, () => console.log(`Server listening on :${port}`));
  })
  .catch((err) => {
    console.error('Database migration failed', err);
    process.exit(1);
  });
