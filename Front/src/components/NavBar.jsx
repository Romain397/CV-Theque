import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../auth';
import { useThemeMode } from '../theme';

export function NavBar(){
  const { user } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const navButtonSx = { color: 'inherit' };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        top: 0,
        borderBottom: '1px solid var(--border-color)',
        bgcolor: 'var(--surface-bg)',
        color: 'var(--text-primary)',
        zIndex: 9999,
        isolation: 'isolate',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="h6" component={RouterLink} to="/" sx={{ textDecoration: 'none', color: 'inherit', fontWeight: 950 }}>GotT</Typography>
          <Button component={RouterLink} to="/" size="small" sx={navButtonSx}>Talents</Button>
          <Button component={RouterLink} to="/schools" size="small" sx={navButtonSx}>Ecoles</Button>
          <Button component={RouterLink} to="/companies" size="small" sx={navButtonSx}>Entreprises</Button>
          <Button component={RouterLink} to="/jobs" size="small" sx={navButtonSx}>Offres</Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            type="button"
            onClick={toggleMode}
            startIcon={mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
            size="small"
            sx={{ textTransform: 'none', fontWeight: 800 }}
          >
            {mode === 'dark' ? 'Mode clair' : 'Mode sombre'}
          </Button>
          {user ? (
            <>
              {user.role === 'admin' && <Button component={RouterLink} to="/admin" size="small" sx={navButtonSx}>Admin</Button>}
              {user.role === 'school' && <Button component={RouterLink} to="/school-requests" size="small" sx={navButtonSx}>Demandes</Button>}
              {user.role === 'company' && <Button component={RouterLink} to="/company-requests" size="small" sx={navButtonSx}>Demandes</Button>}
              <Button component={RouterLink} to="/profile" size="small" sx={navButtonSx}>{user.name}</Button>
            </>
          ) : (
            <Button component={RouterLink} to="/login" size="small" sx={navButtonSx}>Se connecter</Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default NavBar;
