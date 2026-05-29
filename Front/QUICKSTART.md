# 🚀 Démarrage - 3 étapes simples

## 1️⃣ Installation (une seule fois)

Ouvrir un terminal dans le dossier `Front`:

```bash
npm install
```

Ça télécharge tous les outils nécessaires (ça peut prendre 1-2 minutes).

## 2️⃣ Configuration (une seule fois)

Vérifier que le fichier `.env.local` existe. Il doit contenir:

```env
VITE_API_URL=http://localhost:8000/api
```

(C'est là que l'application cherche l'API)

## 3️⃣ Démarrer l'application

Toujours dans le dossier `Front`, taper:

```bash
npm run dev
```

Vous verrez:
```
➜  Local:   http://localhost:5173/
```

**Ouvrir ce lien dans le navigateur.** ✅

---

## 🔧 Avant de tester

⚠️ **IMPORTANT:** L'API Symfony doit tourner!

Dans un AUTRE terminal (dossier `Back`):

```bash
cd Back
symfony serve
```

ou

```bash
php -S localhost:8000
```

---

## ✅ Ça marche si...

- [ ] La page s'affiche
- [ ] Le titre "Gestion des Étudiants" apparaît
- [ ] Vous voyez une liste d'étudiants (ou "Aucun étudiant")
- [ ] Les boutons "Ajouter" et "Rafraîchir" marchent
- [ ] Vous pouvez ajouter/éditer/supprimer un étudiant

---

## 📚 Je veux comprendre le code?

→ Lire **GUIDE_DEBUTANTS.md** (expliqué simple!)

---

## 🆘 Ça ne marche pas?

### Erreur "Cannot GET /api/students"
→ L'API Symfony n'est pas en cours d'exécution

**Solution:** Démarrer le backend (voir section "Avant de tester")

### Erreur CORS
→ Le backend refuse les requêtes

**Solution:** Vérifier config CORS Symfony (voir **INTEGRATION_BACKEND.md**)

### Rien ne s'affiche
1. Ouvrir DevTools (F12)
2. Onglet Console
3. Chercher les erreurs rouges
4. Lire **TROUBLESHOOTING.md**

---

## 📞 Besoin d'aide?

- 📖 **GUIDE_DEBUTANTS.md** - Guide simple pour débutants
- 🏗️ **ARCHITECTURE.md** - Structure du projet
- 🔗 **INTEGRATION_BACKEND.md** - Connecter le backend
- 🆘 **TROUBLESHOOTING.md** - Déboguer

---

**C'est prêt ! 🎉**

