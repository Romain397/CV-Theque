# 🐛 Troubleshooting - Débogage et problèmes courants

## 🔴 L'application ne démarre pas

### Erreur : "Cannot find module"

```bash
npm install
```

### Erreur : Port 5173 déjà utilisé

```bash
# Utiliser un autre port
npm run dev -- --port 3000
```

## 🔴 Aucun étudiant ne s'affiche

### 1️⃣ Vérifier la console navigateur

- Ouvrir DevTools (F12)
- Onglet Console
- Chercher les erreurs rouges

### 2️⃣ Vérifier la requête API

- Ouvrir DevTools (F12)
- Onglet Network
- Recharger la page
- Chercher "students" dans les requêtes
- Vérifier le status HTTP (200 = bon)

### 3️⃣ Vérifier que l'API fonctionne

```bash
# Tester l'API directement
curl http://localhost:8000/api/students

# Ou avec Postman
GET http://localhost:8000/api/students
```

## 🔴 Erreur CORS

### Symptôme
```
Access to XMLHttpRequest at 'http://localhost:8000/api/students' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

### Solution dans Symfony

**Fichier : `Back/config/packages/cors.yaml`**

```yaml
cors:
  defaults:
    originRegex: '^http://localhost'
    allowedOrigins: ['*']
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
    allowedHeaders: ['*']
    maxAge: 3600
```

Ou installer le bundle :
```bash
composer require symfony/cors
```

## 🔴 Erreur : "Cannot GET /api/students"

### Cause
L'API Symfony n'est pas en cours d'exécution

### Solution
```bash
cd Back
symfony serve
# ou
php -S localhost:8000
```

## 🔴 Les données ne se mettent à jour

### Vérifier que le hook useStudents est utilisé

```jsx
// ✅ BON
const { students, addStudent } = useStudents();

// ❌ MAUVAIS
fetch('/api/students').then(...)
```

## 🔴 Erreur lors de l'ajout d'un étudiant

### 1️⃣ Vérifier la validation

- Tous les champs sont requis
- L'âge doit être un nombre positif
- Vérifier les messages d'erreur du formulaire

### 2️⃣ Vérifier la réponse API

- Ouvrir DevTools → Network
- Chercher la requête POST
- Vérifier le status (201 = bon, 400 = erreur)
- Vérifier la réponse JSON

### 3️⃣ Vérifier l'API Symfony

- L'endpoint POST /students existe-t-il ?
- Retourne-t-il du JSON ?
- Retourne-t-il le nouvel étudiant avec son ID ?

## 🔴 L'indicateur de chargement ne s'affiche pas

### Vérifier le composant

```jsx
import { LoadingIndicator } from './LoadingIndicator';

// Dans le composant
<LoadingIndicator loading={loading} />
```

### Vérifier que loading est utilisé

```jsx
const { loading } = useStudents();
```

## 🔴 Les erreurs ne s'affichent pas

### Vérifier le composant

```jsx
import { ErrorAlert } from './ErrorAlert';

// Dans le composant
<ErrorAlert error={error} onClose={handleCloseError} />
```

### Vérifier que error est utilisé

```jsx
const { error } = useStudents();
```

## 🔴 Le formulaire ne se ferme pas après l'ajout

### Vérifier que handleFormClose est appelé

```jsx
const handleFormSubmit = async (formData) => {
  try {
    await addStudent(formData);
    handleFormClose();  // Important !
  } catch (err) {
    console.error(err);
  }
};
```

## 🟡 Avertissements dans la console

### Avertissement : "Missing dependency in useEffect"

```jsx
useEffect(() => {
  fetchStudents();
}, [fetchStudents]); // Ajouter les dépendances
```

### Avertissement : "Key prop missing in list"

```jsx
{students.map((student) => (
  <StudentCard
    key={student.id}  // Important !
    student={student}
  />
))}
```

## 🟡 Performance

### L'app est lente au chargement

1. Vérifier que l'API répond rapidement
2. Ouvrir DevTools → Performance
3. Enregistrer le chargement
4. Voir où le temps est consommé

### Trop de re-renders

```jsx
// Utiliser useCallback pour mémoriser les fonctions
const handleDelete = useCallback(() => {
  // ...
}, []);
```

## 🔧 Utiles - DevTools

### React DevTools

1. Installer l'extension : "React Developer Tools"
2. Inspecteur des composants
3. Voir l'état (props, state)

### Network Tab

1. DevTools → Network
2. Recharger (Ctrl+R)
3. Voir les requêtes
4. Cliquer pour voir les détails

### Console Tab

1. DevTools → Console
2. Voir les logs et erreurs
3. Tester du code JavaScript

## 📝 Logs de débogage utiles

### Ajouter des logs

```jsx
const { students, loading, error, addStudent } = useStudents();

useEffect(() => {
  console.log('Students:', students);
  console.log('Loading:', loading);
  console.log('Error:', error);
}, [students, loading, error]);
```

### Logger dans le service

```js
export const getStudents = async () => {
  console.log('Fetching students...');
  const response = await fetch(`${API_BASE_URL}/students`);
  console.log('Response:', response);
  return await response.json();
};
```

### Logger dans le hook

```js
const fetchStudents = useCallback(async () => {
  console.log('fetchStudents called');
  setLoading(true);
  try {
    const data = await studentsService.getStudents();
    console.log('Data received:', data);
    setStudents(data);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    setLoading(false);
  }
}, []);
```

## ✅ Checklist de débogage

- [ ] Vérifier la console pour les erreurs
- [ ] Vérifier Network pour les requêtes HTTP
- [ ] Tester l'API directement avec curl/Postman
- [ ] Vérifier que Symfony est en cours d'exécution
- [ ] Vérifier CORS
- [ ] Vérifier les logs du serveur Symfony
- [ ] Vérifier que les hooks sont utilisés
- [ ] Vérifier que les services sont appelés
- [ ] Vérifier la validation du formulaire
- [ ] Vérifier les messages d'erreur

## 📞 Besoin d'aide ?

1. Lire la documentation : **ARCHITECTURE.md**
2. Voir les exemples : **EXEMPLES.md**
3. Vérifier l'intégration : **INTEGRATION_BACKEND.md**
4. Consulter : **CHECKLIST.md**

---

**Si le problème persiste, vérifiez que :**
1. L'API Symfony est en cours d'exécution
2. CORS est configuré
3. Les endpoints existent
4. La base de données a des données
5. La structure des données correspond au modèle
