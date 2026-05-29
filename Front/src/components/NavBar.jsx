import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../auth';

export function NavBar(){
  const { user } = useAuth();
  return (
    <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: '1px solid #eee' }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="h6" component={RouterLink} to="/" sx={{ textDecoration: 'none', color: 'inherit' }}>CV-Theque</Typography>
          <Button component={RouterLink} to="/" size="small">Talents</Button>
          <Button component={RouterLink} to="/schools" size="small">Ecoles</Button>
          <Button component={RouterLink} to="/companies" size="small">Entreprises</Button>
          <Button component={RouterLink} to="/jobs" size="small">Offres</Button>
        </Box>
        <Box>
          {user ? (
            <>
              {user.role === 'admin' && <Button component={RouterLink} to="/admin" size="small">Admin</Button>}
              <Button component={RouterLink} to="/profile" size="small">{user.name}</Button>
            </>
          ) : (
            <Button component={RouterLink} to="/login" size="small">Se connecter</Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default NavBar;
