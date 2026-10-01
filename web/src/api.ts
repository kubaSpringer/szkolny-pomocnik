export interface User {
  id: number;
  email: string;
  name: string | null;
  picture: string | null;
}

export interface Exam {
  id: number;
  subject: string;
  title: string;
  examDate: string;
  description: string;
  status: 'upcoming' | 'done';
  resultNote: string | null;
  finishedAt: string | null;
}

export interface ExamListItem extends Exam {
  tasksTotal: number;
  tasksDone: number;
  flashcardsTotal: number;
  quizPaused: boolean;
}

export interface PrepTask {
  id: number;
  text: string;
  done: boolean;
}

export interface Flashcard {
  id: number;
  question: string;
  answer: string;
}

/** An unfinished quiz round, saved after each answer. Card ids refer to `flashcards`. */
export interface QuizSession {
  round: number[];
  index: number;
  failed: number[];
  isRetake: boolean;
}

export interface ExamDetails extends Exam {
  tasks: PrepTask[];
  flashcards: Flashcard[];
  quizSession: QuizSession | null;
}

export interface ExamInput {
  subject: string;
  title: string;
  examDate: string;
  description: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${url}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Coś poszło nie tak.');
  return data as T;
}

export const api = {
  config: () => request<{ googleClientId: string }>('GET', '/config'),
  me: () => request<User>('GET', '/me'),
  loginWithGoogle: (credential: string) => request<User>('POST', '/auth/google', { credential }),
  logout: () => request('POST', '/auth/logout'),

  listExams: (status: 'upcoming' | 'done') => request<ExamListItem[]>('GET', `/exams?status=${status}`),
  getExam: (id: number) => request<ExamDetails>('GET', `/exams/${id}`),
  createExam: (input: ExamInput) => request<Exam>('POST', '/exams', input),
  updateExam: (id: number, input: ExamInput) => request<Exam>('PATCH', `/exams/${id}`, input),
  deleteExam: (id: number) => request('DELETE', `/exams/${id}`),
  finishExam: (id: number, resultNote: string) => request<Exam>('POST', `/exams/${id}/finish`, { resultNote }),
  reopenExam: (id: number) => request<Exam>('POST', `/exams/${id}/reopen`),

  addTask: (examId: number, text: string) => request<PrepTask>('POST', `/exams/${examId}/tasks`, { text }),
  setTaskDone: (id: number, done: boolean) => request<PrepTask>('PATCH', `/tasks/${id}`, { done }),
  deleteTask: (id: number) => request('DELETE', `/tasks/${id}`),

  addFlashcard: (examId: number, question: string, answer: string) =>
    request<Flashcard>('POST', `/exams/${examId}/flashcards`, { question, answer }),
  deleteFlashcard: (id: number) => request('DELETE', `/flashcards/${id}`),

  saveQuizSession: (examId: number, session: QuizSession) =>
    request('PUT', `/exams/${examId}/quiz-session`, session),
  clearQuizSession: (examId: number) => request('DELETE', `/exams/${examId}/quiz-session`),
};
