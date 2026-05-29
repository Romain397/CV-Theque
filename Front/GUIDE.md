# 📖 GUIDE COMPLET - Pour Débutants en React

Ce guide contient TOUT ce qu'il faut savoir pour démarrer et comprendre le code.

---

## 🚀 Partie 1: DÉMARRER L'APP

### 1️⃣ Installation (une seule fois)

```bash
cd Front
npm install
```

### 2️⃣ Vérifier la config

Fichier `.env.local` doit contenir:
```env
VITE_API_URL=http://localhost:8000/api
```

### 3️⃣ Démarrer

```bash
npm run dev
```

Ouvrir: **http://localhost:5173**

⚠️ **L'API Symfony doit tourner!** (autre terminal, dossier `Back`):
```bash
symfony serve
```

---

## 📚 Partie 2: COMPRENDRE REACT

### Les 3 concepts clés

#### 1. L'ÉTAT (State)

L'état = la mémoire d'un composant

```javascript
const [count, setCount] = useState(0);

// count = valeur actuelle (0)
// setCount = fonction pour la changer
// 0 = valeur initiale

// Utiliser:
console.log(count); // 0

// Modifier (DÉCLENCHE UN RE-RENDER):
setCount(1); // count devient 1
```

**Important:** Quand l'état change, React re-affiche le composant!

---

#### 2. L'EFFET (useEffect)

L'effet = faire quelque chose au montage du composant

```javascript
useEffect(() => {
  console.log('Le composant s\'est affiché');
  fetchData();
}, []); // [] = une seule fois
```

**Différents modes:**
```javascript
useEffect(() => { /* code */ }, []); 
// [] = s'exécute UNE FOIS au montage

useEffect(() => { /* code */ }, [dependency]);
// Quand dependency change, s'exécute

useEffect(() => { /* code */ });
// S'exécute À CHAQUE rendu (⚠️ danger!)
```

---

#### 3. LES HOOKS

Un hook = une fonction React qui gère la logique

**Les hooks principaux:**
```javascript
useState()    // Créer un état
useEffect()   // Faire quelque chose
useCallback() // Mémoriser une fonction
```

**Les hooks personnalisés:**
```javascript
const { students, loading } = useStudents();
// Retourne l'état + les fonctions
```

---

### Cycle de vie d'un composant

```
1. MONTAGE (le composant s'affiche)
   ↓
2. useEffect s'exécute (si [])
   ↓
3. Récupérer les données
   ↓
4. setState() → met à jour l'état
   ↓
5. RE-RENDER (React re-affiche)
   ↓
6. L'utilisateur voit les données
```

---

## 🏗️ Partie 3: LA STRUCTURE DU PROJET

### Les 3 piliers

```
┌─────────────────────────────────────┐
│   COMPOSANTS (affichage)            │
│   StudentsList.jsx, StudentCard.jsx │
└──────────────┬──────────────────────┘
               │ utilisent
               ↓
┌─────────────────────────────────────┐
│   HOOKS (logique métier)            │
│   useStudents.js                    │
└──────────────┬──────────────────────┘
               │ appelle
               ↓
┌─────────────────────────────────────┐
│   SERVICES (appels API)             │
│   studentsService.js                │
└──────────────┬──────────────────────┘
               │ fait
               ↓
┌─────────────────────────────────────┐
│   fetch() à l'API                   │
└─────────────────────────────────────┘
```

---

### Structure des fichiers

```
src/
├── services/
│   └── studentsService.js    ← "SEUL" endroit avec fetch()
│
├── hooks/
│   └── useStudents.js        ← La logique, retourne {students, loading, addStudent, etc}
│
├── components/               ← Affichage uniquement
│   ├── StudentsList.jsx      ← Grand composant (utilise le hook)
│   ├── StudentCard.jsx       ← Affiche un étudiant
│   ├── StudentForm.jsx       ← Formulaire
│   ├── LoadingIndicator.jsx  ← Spinner (⏳)
│   └── ErrorAlert.jsx        ← Messages d'erreur
│
├── App.jsx                   ← Point d'entrée
└── main.jsx                  ← Démarre l'app
```

---

### Qui parle à qui?

```javascript
// 1. Composant utilise le hook
const StudentsList = () => {
  const { students, addStudent } = useStudents();
  //      ↑ données du hook
};

// 2. Hook utilise le service
const useStudents = () => {
  const addStudent = async (data) => {
    const newStudent = await studentsService.createStudent(data);
    //                    ↑ service
  };
};

// 3. Service fait le fetch()
export const createStudent = async (data) => {
  const response = await fetch('/api/students', { /* ... */ });
  //                        ↑ SEUL fetch()
};
```

**Règle d'or:** ✅ Aucun fetch() dans les composants!

---

## 🔄 Partie 4: EXEMPLE COMPLET

### Ajouter un étudiant - Pas à pas

#### Étape 1: L'utilisateur clique
```javascript
<Button onClick={handleAddClick}>
  Ajouter
</Button>
```

#### Étape 2: Le formulaire s'ouvre
```javascript
const handleAddClick = () => {
  setFormOpen(true);
};
```

#### Étape 3: L'utilisateur remplit et soumet
```javascript
const handleFormSubmit = async (formData) => {
  setSubmitting(true);
  try {
    await addStudent(formData); // Appeler le hook
    handleFormClose();
  } catch (err) {
    console.error(err);
  } finally {
    setSubmitting(false);
  }
};
```

#### Étape 4: Le hook appelle le service
```javascript
const addStudent = useCallback(async (studentData) => {
  const newStudent = await studentsService.createStudent(studentData);
  setStudents((prev) => [...prev, newStudent]); // Ajouter à la liste
}, []);
```

#### Étape 5: Le service fait le fetch
```javascript
export const createStudent = async (data) => {
  const response = await fetch('/api/students', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return await response.json();
};
```

#### Étape 6: L'API répond
```
Backend: INSERT INTO students ...
Retour: { id: 123, firstName: "John", ... }
```

#### Étape 7: React re-rend
```javascript
// L'état students a changé
// React re-rend StudentsList
// Le nouvel étudiant apparaît! ✅
```

---

## 🎨 Partie 5: LES FICHIERS EXPLIQUÉS

### `src/services/studentsService.js`

```javascript
// SEUL endroit où on utilise fetch()

export const getStudents = async () => {
  // GET /api/students
  const response = await fetch(`${API_BASE_URL}/students`);
  return await response.json();
};

export const createStudent = async (data) => {
  // POST /api/students
  const response = await fetch(`${API_BASE_URL}/students`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return await response.json();
};
```

**À modifier?** Non (sauf si l'API change)

---

### `src/hooks/useStudents.js`

```javascript
// La logique métier

export const useStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await studentsService.getStudents();
      setStudents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  return {
    students,
    loading,
    error,
    addStudent: async (data) => { /* ... */ },
    updateStudentItem: async (id, data) => { /* ... */ },
    removeStudent: async (id) => { /* ... */ },
  };
};
```

**À modifier?** Rarement

---

### `src/components/StudentsList.jsx`

```javascript
// Le composant principal

export const StudentsList = () => {
  // Utiliser le hook
  const { students, loading, error, addStudent } = useStudents();

  // État local pour le formulaire
  const [formOpen, setFormOpen] = useState(false);

  // Afficher
  return (
    <Container>
      <LoadingIndicator loading={loading} />
      <ErrorAlert error={error} />
      <Button onClick={() => setFormOpen(true)}>
        Ajouter
      </Button>
      {students.map(s => (
        <StudentCard key={s.id} student={s} />
      ))}
      <StudentForm open={formOpen} onSubmit={addStudent} />
    </Container>
  );
};
```

**À modifier?** OUI pour changer la layout

---

### `src/components/StudentCard.jsx`

```javascript
// Affiche UN étudiant

export const StudentCard = ({ student, onEdit, onDelete }) => {
  return (
    <Card>
      <CardContent>
        <h2>{student.firstName} {student.lastName}</h2>
        <p>Âge: {student.age}</p>
      </CardContent>
      <CardActions>
        <Button onClick={() => onEdit(student)}>Éditer</Button>
        <Button onClick={() => onDelete(student.id)}>Supprimer</Button>
      </CardActions>
    </Card>
  );
};
```

**À modifier?** OUI pour afficher plus/moins de champs

---

## ⚠️ Partie 6: ERREURS COURANTES

### ❌ Erreur 1: Fetch dans un composant

```javascript
// ❌ MAUVAIS
export const MyComponent = () => {
  fetch('/api/students'); // ← NON!
  return <div>{students}</div>;
};

// ✅ BON
export const MyComponent = () => {
  const { students } = useStudents(); // ← OUI
  return <div>{students.map(...)}</div>;
};
```

### ❌ Erreur 2: Modifier l'état directement

```javascript
// ❌ MAUVAIS
students[0] = newData;

// ✅ BON
setStudents(students.map(s => 
  s.id === 1 ? newData : s
));
```

### ❌ Erreur 3: Oublier les dépendances useEffect

```javascript
// ❌ MAUVAIS
useEffect(() => {
  fetchStudents();
}); // S'exécute à CHAQUE rendu!

// ✅ BON
useEffect(() => {
  fetchStudents();
}, [fetchStudents]); // S'exécute quand fetchStudents change
```

---

## 🧪 Partie 7: DÉBOGUER

### Comment voir ce qui se passe?

**Ouvrir DevTools: F12**

#### Onglet Console
```javascript
// Voir les erreurs rouges
// Voir les console.log()
console.log('Students:', students);
```

#### Onglet Network
```
1. Ouvrir DevTools
2. Onglet Network
3. Recharger la page
4. Chercher "students"
5. Vérifier le status HTTP (200 = bon)
```

#### React DevTools
```
1. Installer extension "React Developer Tools"
2. Inspecter les composants
3. Voir l'état (props, state)
4. Voir les re-renders
```

---

## 🚀 Partie 8: MODIFIER QUELQUE CHOSE

### Je veux ajouter un champ

**Exemple: Ajouter un email**

1. Ouvrir `src/components/StudentForm.jsx`
2. Ajouter un champ:
```jsx
<TextField
  label="Email"
  value={formData.email}
  onChange={(e) => setFormData({...formData, email: e.target.value})}
/>
```
3. Envoyer avec les autres données ✅

### Je veux afficher plus d'infos

**Exemple: Afficher l'email dans la carte**

1. Ouvrir `src/components/StudentCard.jsx`
2. Ajouter:
```jsx
<p>Email: {student.email}</p>
```
3. C'est fait! ✅

### Je veux changer les couleurs

1. Ouvrir n'importe quel composant
2. Chercher `sx={{ }}`
3. Modifier les couleurs:
```jsx
sx={{ backgroundColor: 'blue', color: 'white' }}
```
4. C'est fait! ✅

---

## 📞 Besoin d'aide?

- **Erreur?** → Voir [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Connexion API?** → Voir [INTEGRATION_BACKEND.md](./INTEGRATION_BACKEND.md)
- **Exemples de code?** → Voir [EXEMPLES.md](./EXEMPLES.md)
- **Déboguer?** → Voir la Partie 7 de ce guide

---

## 🎉 Vous avez tout ce qu'il faut!

**Prochaine étape?**

1. Lisez les commentaires dans le code (ils expliquent!)
2. Modifiez un composant
3. Cassez quelque chose et réparez-le
4. Amusez-vous! 🚀

---

**Développé pour les débutants en React niveau B2** ✅
