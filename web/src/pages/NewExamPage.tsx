import { api } from '../api';
import { ExamForm } from '../components/ExamForm';
import { navigate } from '../router';

export function NewExamPage() {
  return (
    <div>
      <a href="#/" class="back">
        ← Wróć
      </a>
      <h1>Nowy sprawdzian ✏️</h1>
      <div class="card">
        <ExamForm
          submitLabel="Zapisz sprawdzian"
          onSubmit={async (input) => {
            const exam = await api.createExam(input);
            navigate(`/sprawdzian/${exam.id}`);
          }}
          onCancel={() => navigate('/')}
        />
      </div>
    </div>
  );
}
