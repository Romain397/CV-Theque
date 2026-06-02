# Guide d'intégration Frontend-Backend

## 🔌 Connexion Frontend-Backend

Ce guide explique comment connecter le frontend React avec le backend API Symfony.

## ✅ Prérequis

### Backend (Symfony)

1. ✅ API Symfony configurée et en cours d'exécution
2. ✅ Base de données MySQL créée
3. ✅ Entités Symfony (Student, Skill, Project)
4. ✅ Migrations Doctrine exécutées
5. ✅ Contrôleurs REST retournant du JSON

### Frontend (React)

1. ✅ Dépendances npm installées (`npm install`)
2. ✅ Fichier `.env` configuré avec l'URL de l'API
3. ✅ Application Vite en cours d'exécution (`npm run dev`)

## 🔧 Configuration

### 1. URL de l'API

**Fichier : `.env.local`**

```env
# Local development
VITE_API_URL=http://localhost:8000/api

# Production
# VITE_API_URL=https://api.mondomaine.com/api
```

### 2. CORS - Configuration Symfony

Pour que le frontend puisse accéder à l'API, configurez CORS dans Symfony :

**Fichier : `Back/config/packages/cors.yaml`**

```yaml
cors:
  defaults:
    originRegex: '^http://localhost'
    allowedOrigins: ['*']
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
    allowedHeaders: ['*']
    maxAge: 3600
    exposeHeaders: ['Link']
```

**OU via bundle Symfony (installation) :**

```bash
cd Back
composer require symfony/cors
```

## 📋 Endpoints API attendus

L'application Frontend utilise ces endpoints :

### Étudiants

```http
GET    /api/students           # Liste tous les étudiants
GET    /api/students/{id}      # Récupère un étudiant
POST   /api/students           # Crée un étudiant
PUT    /api/students/{id}      # Mettre à jour un étudiant
DELETE /api/students/{id}      # Supprime un étudiant
```

### Format de requête (POST/PUT)

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "age": 25,
  "position": "Développeur Full Stack",
  "location": "Paris",
  "skills": [
    {
      "name": "JavaScript",
      "level": "Avancé"
    }
  ],
  "projects": [
    {
      "name": "Mon Portfolio",
      "technologies": ["React", "Node.js"],
      "description": "...",
      "medias": []
    }
  ]
}
```

### Format de réponse (GET)

```json
[
  {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "age": 25,
    "position": "Développeur Full Stack",
    "location": "Paris",
    "skills": [
      {
        "id": 1,
        "name": "JavaScript",
        "level": "Avancé"
      }
    ],
    "projects": [
      {
        "id": 1,
        "name": "Mon Portfolio",
        "technologies": ["React", "Node.js"],
        "description": "...",
        "medias": []
      }
    ]
  }
]
```

## 🧪 Test avec Postman

### 1. Tester l'API

Avant de tester le frontend, testez l'API avec Postman :

1. Ouvrir Postman
2. Créer une requête GET vers `http://localhost:8000/api/students`
3. Vérifier que l'API retourne les données attendues

### 2. Vérifier CORS

```http
curl -X GET http://localhost:8000/api/students \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

Vous devriez voir dans les headers de réponse :
```
Access-Control-Allow-Origin: http://localhost:5173
```

## 🚀 Démarrage intégré

### 1. Démarrer le Backend

```bash
cd Back
php -S localhost:8000
# ou
symfony serve
```

L'API sera accessible à : `http://localhost:8000`

### 2. Démarrer le Frontend

```bash
cd Front
npm run dev
```

L'application sera accessible à : `http://localhost:5173`

### 3. Tester l'intégration

1. Ouvrir `http://localhost:5173`
2. Vous devriez voir la liste des étudiants
3. Ajouter, modifier et supprimer un étudiant

## 🐛 Troubleshooting

### Erreur : "Cannot GET /api/students"

**Cause** : L'API Symfony n'est pas en cours d'exécution ou le contrôleur n'existe pas

**Solution** :
```bash
cd Back
symfony serve
# ou
php -S localhost:8000
```

### Erreur CORS

**Cause** : CORS n'est pas configuré dans Symfony

**Solution** :
1. Installer le bundle CORS
2. Configurer `config/packages/cors.yaml`
3. Redémarrer le serveur Symfony

### Erreur : "net::ERR_CONNECTION_REFUSED"

**Cause** : L'URL de l'API est incorrecte

**Solution** :
1. Vérifier que Symfony est en cours d'exécution
2. Vérifier l'URL dans `.env.local`
3. Utiliser `http://localhost:8000/api` (pas https)

### Aucun étudiant affiché

**Cause** : La base de données ne contient pas de données

**Solution** :
1. Créer des données de test dans la base de données
2. Vérifier via Postman que l'API retourne des données
3. Vérifier les erreurs dans la console navigateur

## 📊 Vérifier l'intégration

### Console navigateur

1. Ouvrir DevTools (F12)
2. Aller dans l'onglet "Network"
3. Effectuer une action (chargement, ajout, modification)
4. Vérifier les requêtes HTTP

### Erreurs

1. Onglet "Console" dans DevTools
2. Les erreurs d'API s'affichent avec le message
3. Vérifier que la réponse est du JSON valide

## 🔐 Sécurité

### En développement
- ✅ CORS accepte toutes les origines (localhost)
- ✅ Pas d'authentification requise

### En production
- ⚠️ Modifier CORS pour accepter uniquement votre domaine
- ⚠️ Ajouter une authentification (JWT recommandé)
- ⚠️ Valider les données côté serveur

## 📝 Notes importantes

1. **Le frontend communique UNIQUEMENT via l'API** - Aucune donnée mock
2. **Format JSON obligatoire** - Les contrôleurs doivent retourner du JSON
3. **Gestion d'erreur côté frontend** - Les erreurs API sont affichées
4. **Aucun fetch() dans les composants** - Tous les appels passent par le service

## 🆘 Besoin d'aide ?

Consultez les documentations :
- [Symfony REST API](https://symfony.com/doc/current/best_practices.html)
- [CORS avec Symfony](https://symfony.com/doc/current/bundles/NelmioCorsBundle/index.html)
- [React Fetch API](https://react.dev/learn/synchronizing-with-effects)

---

**Développé pour le TP3 - GotT - 2FRNT Développement Frontend Avancé**
