# Architecture Frontend - GotT

## Vue d'ensemble

Cette application React suit une architecture professionnelle et modulaire selon les recommendations du TP :

```
src/
├── components/        # Composants UI uniquement
│   ├── StudentsList.jsx      # Composant principal (gère l'orchestration)
│   ├── StudentCard.jsx       # Affiche une carte étudiant
│   ├── StudentForm.jsx       # Formulaire d'ajout/édition
│   ├── LoadingIndicator.jsx  # Indicateur de chargement
│   └── ErrorAlert.jsx        # Affichage des erreurs
├── hooks/             # Logique métier réutilisable
│   └── useStudents.js        # Hook personnalisé pour la gestion des étudiants
├── services/          # Appels API centralisés
│   └── studentsService.js    # Service pour communiquer avec l'API
├── App.jsx
├── main.jsx
└── ...
```

## Principes d'architecture

### 1. **Services** (`/services/studentsService.js`)
- **Responsabilité** : Centraliser TOUS les appels API
- **Aucun fetch()** dans les composants ou hooks
- **Fonctions** :
  - `getStudents()` - GET /students
  - `getStudentById(id)` - GET /students/{id}
  - `createStudent(data)` - POST /students
  - `updateStudent(id, data)` - PUT /students/{id}
  - `deleteStudent(id)` - DELETE /students/{id}

### 2. **Hooks** (`/hooks/useStudents.js`)
- **Responsabilité** : Gestion de la logique métier
- **Gère** :
  - État des étudiants
  - État de chargement
  - Gestion des erreurs
  - Appels au service
  - Orchestration des opérations CRUD
- **Aucun fetch()** direct

### 3. **Composants** (`/components/`)
- **Responsabilité** : Affichage uniquement
- **Aucune logique API** - tout passe par les hooks
- **Gestion d'événements** : Appelle les fonctions du hook
- **Props** : Reçoit données et callbacks

## Flux de données

```
Composant → Hook → Service → API
   ↓         ↓        ↓       ↓
  UI    Logique   Requête  Données
```

### Exemple : Récupération des étudiants

1. **Composant** (`StudentsList.jsx`) :
   ```jsx
   const { students, loading, error } = useStudents();
   ```

2. **Hook** (`useStudents.js`) :
   ```jsx
   useEffect(() => {
     fetchStudents();
   }, []);
   
   const fetchStudents = async () => {
     const data = await studentsService.getStudents();
     setStudents(data);
   };
   ```

3. **Service** (`studentsService.js`) :
   ```js
   export const getStudents = async () => {
     const response = await fetch(`${API_BASE_URL}/students`);
     return await response.json();
   };
   ```

## Gestion des états

### États du composant principal
- **students** : Array - Liste des étudiants
- **loading** : Boolean - Indicateur de chargement
- **error** : String|null - Message d'erreur
- **submitting** : Boolean - Indicateur de soumission de formulaire

### Affichage conditionnel
```jsx
<LoadingIndicator loading={loading} />
<ErrorAlert error={error} onClose={handleCloseError} />
{students.length === 0 ? <EmptyState /> : <StudentsList />}
```

## Opérations CRUD

### Créer (Create)
```jsx
const handleFormSubmit = async (formData) => {
  await addStudent(formData);  // Hook
};
```
**API** : POST `/students`

### Lire (Read)
```jsx
useEffect(() => {
  fetchStudents();  // Hook - appelé automatiquement au montage
}, []);
```
**API** : GET `/students`

### Mettre à jour (Update)
```jsx
const handleEditClick = (student) => {
  setSelectedStudent(student);
  setFormOpen(true);
};

const handleFormSubmit = async (formData) => {
  await updateStudentItem(selectedStudent.id, formData);  // Hook
};
```
**API** : PUT `/students/{id}`

### Supprimer (Delete)
```jsx
const handleDeleteClick = async (id) => {
  await removeStudent(id);  // Hook
};
```
**API** : DELETE `/students/{id}`

## Configuration

### Variables d'environnement
Créez un fichier `.env.local` :
```env
VITE_API_URL=http://localhost:8000/api
```

L'URL de l'API est définie dans `studentsService.js` :
```js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
```

## Dépendances

- **React** : Framework UI
- **@mui/material** : Composants Material Design
  - `Button`, `TextField`, `Dialog`, `Card`, `CircularProgress`, etc.
- **react-router-dom** : Routage (pour extensions futures)
- **zustand** : Gestion d'état (pour extensions futures)

## Installation et démarrage

### 1. Installer les dépendances
```bash
npm install
```

### 2. Configurer l'API
Assurez-vous que l'API Symfony est en cours d'exécution sur `http://localhost:8000`

### 3. Démarrer l'application
```bash
npm run dev
```

### 4. Accéder à l'application
```
http://localhost:5173
```

## Fonctionnalités implémentées

✅ API REST Symfony connectée  
✅ CRUD complet (Create, Read, Update, Delete)  
✅ Gestion du chargement (CircularProgress)  
✅ Gestion des erreurs  
✅ Architecture modulaire  
✅ Services centralisés  
✅ Hooks personnalisés  
✅ Composants propres et réutilisables  
✅ Validation de formulaire  
✅ Aucun mock de données  
✅ Aucun fetch() dans les composants  

## Extensibilité

Cette architecture permet facilement d'ajouter :
- Authentification
- Pagination
- Filtrage/Recherche
- Gestion d'état globale (Zustand)
- Tests unitaires
- Intégration de compétences et projets

## Notes importantes

1. **Aucun fetch() dans les composants** - Tout passe par les services
2. **Aucune donnée mock** - Les données viennent de l'API
3. **Gestion d'erreur complète** - Affichage de messages d'erreur
4. **Indicateur de chargement** - Material UI CircularProgress
5. **Architecture claire** - Services, Hooks, Composants séparés
