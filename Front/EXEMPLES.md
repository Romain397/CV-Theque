# Exemples d'utilisation du hook useStudents

## Exemple 1 : Récupération et affichage

```jsx
import { useStudents } from '../hooks/useStudents';
import { LoadingIndicator } from './LoadingIndicator';
import { ErrorAlert } from './ErrorAlert';

export const MyComponent = () => {
  const { students, loading, error, refresh } = useStudents();

  return (
    <>
      <LoadingIndicator loading={loading} />
      <ErrorAlert error={error} />
      
      {students.map((student) => (
        <div key={student.id}>
          {student.firstName} {student.lastName}
        </div>
      ))}
      
      <button onClick={refresh}>Rafraîchir</button>
    </>
  );
};
```

## Exemple 2 : Créer un étudiant

```jsx
import { useStudents } from '../hooks/useStudents';

export const CreateStudentForm = () => {
  const { addStudent, error } = useStudents();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newStudent = await addStudent({
        firstName: 'John',
        lastName: 'Doe',
        age: 25,
        position: 'Développeur Full Stack',
        location: 'Paris'
      });
      console.log('Étudiant créé:', newStudent);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p>{error}</p>}
      {/* Formulaire */}
    </form>
  );
};
```

## Exemple 3 : Mettre à jour un étudiant

```jsx
import { useStudents } from '../hooks/useStudents';

export const EditStudentForm = ({ studentId, student }) => {
  const { updateStudentItem, error } = useStudents();

  const handleUpdate = async () => {
    try {
      const updated = await updateStudentItem(studentId, {
        firstName: 'Jane',
        lastName: 'Smith',
        age: 26,
        position: 'Développeuse Backend',
        location: 'Lille'
      });
      console.log('Étudiant mis à jour:', updated);
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  return <button onClick={handleUpdate}>Mettre à jour</button>;
};
```

## Exemple 4 : Supprimer un étudiant

```jsx
import { useStudents } from '../hooks/useStudents';

export const DeleteStudentButton = ({ studentId }) => {
  const { removeStudent, error } = useStudents();

  const handleDelete = async () => {
    if (window.confirm('Êtes-vous sûr ?')) {
      try {
        await removeStudent(studentId);
        console.log('Étudiant supprimé');
      } catch (err) {
        console.error('Erreur:', err);
      }
    }
  };

  return (
    <>
      {error && <p>{error}</p>}
      <button onClick={handleDelete}>Supprimer</button>
    </>
  );
};
```

## Exemple 5 : Structure d'un étudiant attendue par l'API

```js
{
  id: 1,
  firstName: "John",
  lastName: "Doe",
  age: 25,
  position: "Développeur Full Stack",
  location: "Paris",
  skills: [
    {
      id: 1,
      name: "JavaScript",
      level: "Avancé"
    },
    {
      id: 2,
      name: "React",
      level: "Intermédiaire"
    }
  ],
  projects: [
    {
      id: 1,
      name: "Mon Portfolio",
      technologies: ["React", "Node.js"],
      description: "Un site portfolio personnel",
      medias: []
    }
  ]
}
```

## Appel API direct au service (si besoin)

```jsx
import * as studentsService from '../services/studentsService';

// Récupérer un étudiant spécifique
const student = await studentsService.getStudentById(1);

// Créer un étudiant
const newStudent = await studentsService.createStudent({
  firstName: 'Alice',
  lastName: 'Johnson',
  age: 24,
  position: 'Designer UI/UX',
  location: 'Bordeaux'
});

// Mettre à jour
const updated = await studentsService.updateStudent(1, {
  position: 'Développeuse Junior'
});

// Supprimer
await studentsService.deleteStudent(1);
```

## Points importants

1. **Le hook `useStudents()` doit être utilisé dans les composants**
2. **Les services ne doivent être utilisés que par les hooks**
3. **Toujours gérer les erreurs avec try/catch**
4. **L'état `loading` doit être affiché pendant les opérations**
5. **Toujours afficher les messages d'erreur à l'utilisateur**
