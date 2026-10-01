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
  grade: string | null;
  resultNote: string | null;
  finishedAt: string | null;
}

export interface ExamListItem extends Exam {
  tasksTotal: number;
  tasksDone: number;
  flashcardsTotal: number;
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

export interface ExamDetails extends Exam {
  tasks: PrepTask[];
  flashcards: Flashcard[];
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
  finishExam: (id: number, grade: string | null, resultNote: string) =>
    request<Exam>('POST', `/exams/${id}/finish`, { grade, resultNote }),
  reopenExam: (id: number) => request<Exam>('POST', `/exams/${id}/reopen`),

  addTask: (examId: number, text: string) => request<PrepTask>('POST', `/exams/${examId}/tasks`, { text }),
  setTaskDone: (id: number, done: boolean) => request<PrepTask>('PATCH', `/tasks/${id}`, { done }),
  deleteTask: (id: number) => request('DELETE', `/tasks/${id}`),

  addFlashcard: (examId: number, question: string, answer: string) =>
    request<Flashcard>('POST', `/exams/${examId}/flashcards`, { question, answer }),
  deleteFlashcard: (id: number) => request('DELETE', `/flashcards/${id}`),
};
