import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../auth';
import {
  Box,
  Button,
  Container,
  Link,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Select,
  Typography,
} from '@mui/material';

export default function Login(){
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  async function handleLogin(e){
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch(err){
      setNotice(null);
      setError(String(err));
    }
  }

  async function handleRegister(e){
    e.preventDefault();
    try {
      const name = `${firstName} ${lastName}`.trim();
      const result = await register({ name, firstName, lastName, email, password, role });
      if (result?.pending) {
        setNotice('Compte créé. Il est en attente de validation par un administrateur avant activation.');
        setMode('login');
        setPassword('');
        setFirstName('');
        setLastName('');
        setRole('student');
      } else {
        navigate('/');
      }
    } catch(err){
      setNotice(null);
      setError(String(err));
    }
  }

  const handleModeChange = (_event, nextMode) => {
    if (nextMode) {
      setMode(nextMode);
      setError(null);
      setNotice(null);
    }
  };

  return (
    <Container sx={{ py: 6 }}>
      <Paper
        elevation={0}
        sx={{
          maxWidth: 720,
          mx: 'auto',
          overflow: 'hidden',
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 24px 60px rgba(17, 36, 59, 0.12)',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ p: 3, pb: 0 }}>
          <Typography variant="overline" sx={{ color: 'var(--text-secondary)', letterSpacing: 2, fontWeight: 900 }}>
            Espace étudiant
          </Typography>
          <Typography component="h1" sx={{ fontSize: 30, fontWeight: 950, lineHeight: 1.05, mt: 0.5 }}>
            Connexion ou création de compte
          </Typography>
          <Typography sx={{ color: 'var(--text-secondary)', mt: 1 }}>
            Sélectionnez l’onglet correspondant pour vous connecter ou créer un compte étudiant.
          </Typography>
        </Box>

        <Box sx={{ px: 3, pt: 2 }}>
          <Tabs
            value={mode}
            onChange={handleModeChange}
            variant="fullWidth"
            indicatorColor="primary"
            sx={{
              minHeight: 44,
              mb: 1,
              '& .MuiTab-root': {
                minHeight: 44,
                textTransform: 'none',
                fontWeight: 900,
                color: 'var(--text-secondary)',
              },
              '& .Mui-selected': {
                color: 'var(--text-primary) !important',
              },
            }}
          >
            <Tab value="login" label="Se connecter" />
            <Tab value="register" label="S'inscrire" />
          </Tabs>
        </Box>

        <Box sx={{ px: 3, pb: 3 }}>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          {notice && (
            <Typography sx={{ mb: 2, color: 'var(--accent)', fontWeight: 700 }}>
              {notice}
            </Typography>
          )}

          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              minHeight: { xs: 560, sm: 430 },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                width: '200%',
                transform: mode === 'login' ? 'translateX(0%)' : 'translateX(-50%)',
                transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
                willChange: 'transform',
              }}
            >
              <Box sx={{ width: '50%', pr: { sm: 1.5 }, pt: 1 }}>
                <Box component="form" onSubmit={handleLogin}>
                  <Stack spacing={2}>
                    <Typography variant="overline" sx={{ color: 'var(--text-secondary)', letterSpacing: 2, fontWeight: 900 }}>
                      Connexion
                    </Typography>
                    <TextField
                      label="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Mot de passe"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      fullWidth
                    />
                    <Button type="submit" variant="contained" size="large" sx={{ textTransform: 'none', fontWeight: 900 }}>
                      Se connecter
                    </Button>
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                      Utilisez vos identifiants existants pour accéder à votre espace.
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                      Démo admin: admin@cvtheque.local / admin123
                    </Typography>
                  </Stack>
                </Box>
              </Box>

              <Box sx={{ width: '50%', pl: { sm: 1.5 }, pt: 1 }}>
                <Box component="form" onSubmit={handleRegister}>
                  <Stack spacing={2}>
                    <Typography variant="overline" sx={{ color: 'var(--text-secondary)', letterSpacing: 2, fontWeight: 900 }}>
                      Inscription
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                      <TextField
                        label="Prénom"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        fullWidth
                      />
                      <TextField
                        label="Nom"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        fullWidth
                      />
                    </Box>
                    <TextField
                      label="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Mot de passe"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      fullWidth
                    />
                    <FormControl fullWidth>
                      <InputLabel id="role-label">Rôle</InputLabel>
                      <Select
                        labelId="role-label"
                        label="Rôle"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        <MenuItem value="student">Étudiant</MenuItem>
                        <MenuItem value="school">École</MenuItem>
                        <MenuItem value="company">Entreprise</MenuItem>
                        <MenuItem value="admin">Administrateur</MenuItem>
                      </Select>
                    </FormControl>
                    <Button type="submit" variant="contained" size="large" sx={{ textTransform: 'none', fontWeight: 900 }}>
                      Créer le compte
                    </Button>
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                      Les comptes sont visibles par l'admin, puis activés avant de pouvoir accéder au site.
                    </Typography>
                  </Stack>
                </Box>
              </Box>
            </Box>
          </Box>

          <Box sx={{ mt: 2.5 }}>
            <Link component={RouterLink} to="/">Retour</Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
