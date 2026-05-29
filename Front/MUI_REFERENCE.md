# 📦 Dépendances et imports Material-UI

## Composants Material-UI utilisés

```jsx
// Composants de base
import { Button, TextField, Dialog, Card, Box, Typography, Paper, Chip, CircularProgress, Alert, Container } from '@mui/material';

// Icônes
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
```

## Installation

```bash
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material
```

## Composants disponibles

### Button
```jsx
<Button variant="contained">Contained</Button>
<Button variant="outlined">Outlined</Button>
<Button variant="text">Text</Button>
<Button color="primary" />
<Button color="secondary" />
<Button color="error" />
<Button disabled />
<Button startIcon={<AddIcon />}>Ajouter</Button>
```

### TextField
```jsx
<TextField label="Nom" />
<TextField type="number" />
<TextField type="email" />
<TextField multiline rows={4} />
<TextField error helperText="Erreur!" />
<TextField fullWidth />
```

### Dialog
```jsx
<Dialog open={open} onClose={onClose}>
  <DialogTitle>Titre</DialogTitle>
  <DialogContent>Contenu</DialogContent>
  <DialogActions>Actions</DialogActions>
</Dialog>
```

### Card
```jsx
<Card>
  <CardContent>Contenu</CardContent>
  <CardActions>Actions</CardActions>
</Card>
```

### Box
```jsx
<Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
  Conteneur flexible
</Box>
```

### Typography
```jsx
<Typography variant="h1">H1</Typography>
<Typography variant="h6">H6</Typography>
<Typography variant="body1">Body</Typography>
<Typography variant="body2">Petit texte</Typography>
<Typography color="textSecondary">Secondaire</Typography>
```

### CircularProgress
```jsx
<CircularProgress />
<CircularProgress size={40} />
```

### Alert
```jsx
<Alert severity="error">Erreur!</Alert>
<Alert severity="warning">Attention</Alert>
<Alert severity="info">Info</Alert>
<Alert severity="success">Succès</Alert>
```

### Chip
```jsx
<Chip label="Tag" />
<Chip label="Tag" variant="outlined" />
<Chip label="Tag" size="small" />
```

### Container
```jsx
<Container maxWidth="sm">
  Contenu limité en largeur
</Container>
```

## Icônes disponibles

```jsx
import AddIcon from '@mui/icons-material/Add';           // +
import EditIcon from '@mui/icons-material/Edit';         // Crayon
import DeleteIcon from '@mui/icons-material/Delete';     // Poubelle
import RefreshIcon from '@mui/icons-material/Refresh';   // Rafraîchir
import SaveIcon from '@mui/icons-material/Save';         // Disquette
```

## Styles avec `sx`

```jsx
<Box sx={{
  display: 'flex',           // Flexbox
  gap: 2,                    // Espacement
  mb: 3,                     // Margin bottom
  p: 2,                      // Padding
  backgroundColor: '#f5f5f5',
  borderRadius: '8px',
  '&:hover': {
    backgroundColor: '#eee',
  }
}}>
  Contenu
</Box>
```

## Breakpoints responsifs

```jsx
<Box sx={{
  fontSize: '14px',
  '@media (max-width: 600px)': {
    fontSize: '12px',
  }
}}>
  Texte responsive
</Box>
```

## Combinaisons communes

```jsx
// Bouton avec icône
<Button startIcon={<AddIcon />} variant="contained">
  Ajouter
</Button>

// Formulaire
<TextField fullWidth label="Nom" margin="normal" />

// Grille 2 colonnes
<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
  <Box>Col 1</Box>
  <Box>Col 2</Box>
</Box>

// Centre
<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
  Contenu centré
</Box>
```

## Thème par défaut

Material-UI utilise le thème Material Design par défaut avec :
- Couleurs primaires et secondaires
- Espacements (2, 4, 8, 16, 24, 32...)
- Typographie standard

## Version utilisée

- Material-UI (MUI) v9.0.1
- @emotion/react et @emotion/styled

---

**Pour plus d'infos :** https://mui.com/
