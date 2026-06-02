import React, { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Checkbox, FormControlLabel, Divider, IconButton, Stack } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { useThemeMode } from '../theme';
import { useHideExtraActions } from '../uiSettings';

export function NavBar(){
  const { user } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const [hideExtraActions, setHideExtraActions] = useHideExtraActions();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navButtonSx = { color: 'inherit', whiteSpace: 'nowrap' };
  const primaryLinks = [
    { label: 'Talents', to: '/' },
    { label: 'Ecoles', to: '/schools' },
    { label: 'Entreprises', to: '/companies' },
    { label: 'Offres', to: '/jobs' },
  ];
  const accountLinks = [
    ...(user?.role === 'admin' ? [{ label: 'Admin', to: '/admin' }] : []),
    ...(user?.role === 'school' ? [{ label: 'Demandes', to: '/school-requests' }] : []),
    ...(user?.role === 'company' ? [{ label: 'Demandes', to: '/company-requests' }] : []),
    ...(user ? [{ label: user.name, to: '/profile' }] : [{ label: 'Se connecter', to: '/login' }]),
  ];

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const renderModeToggle = (compact = false) => (
    <FormControlLabel
      control={
        <Checkbox
          size="small"
          checked={hideExtraActions}
          onChange={(event) => setHideExtraActions(event.target.checked)}
          sx={{ p: 0.5 }}
        />
      }
      label="Mode épuré"
      sx={{
        m: 0,
        mr: compact ? 0 : 0.5,
        px: compact ? 0.5 : 0,
        py: compact ? 0.5 : 0,
        '& .MuiFormControlLabel-label': {
          fontSize: 12,
          fontWeight: 800,
          whiteSpace: 'nowrap',
        },
      }}
    />
  );

  const renderThemeButton = (fullWidth = false) => (
    <Button
      type="button"
      onClick={toggleMode}
      startIcon={mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
      size="small"
      fullWidth={fullWidth}
      sx={{ justifyContent: fullWidth ? 'flex-start' : 'center', textTransform: 'none', fontWeight: 800 }}
    >
      {mode === 'dark' ? 'Mode clair' : 'Mode sombre'}
    </Button>
  );

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
        overflow: 'visible',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: { xs: 1, md: 2 }, alignItems: 'center', minWidth: 0 }}>
          <Typography variant="h6" component={RouterLink} to="/" sx={{ textDecoration: 'none', color: 'inherit', fontWeight: 950 }}>GotT</Typography>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, alignItems: 'center' }}>
            {primaryLinks.map((link) => (
              <Button key={link.to} component={RouterLink} to={link.to} size="small" sx={navButtonSx}>
                {link.label}
              </Button>
            ))}
          </Box>
        </Box>
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, alignItems: 'center', minWidth: 0 }}>
          {renderModeToggle()}
          {renderThemeButton()}
          {user ? (
            <>
              {user.role === 'admin' && <Button component={RouterLink} to="/admin" size="small" sx={navButtonSx}>Admin</Button>}
              {user.role === 'school' && <Button component={RouterLink} to="/school-requests" size="small" sx={navButtonSx}>Demandes</Button>}
              {user.role === 'company' && <Button component={RouterLink} to="/company-requests" size="small" sx={navButtonSx}>Demandes</Button>}
              <Button component={RouterLink} to="/profile" size="small" sx={{ ...navButtonSx, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</Button>
            </>
          ) : (
            <Button component={RouterLink} to="/login" size="small" sx={navButtonSx}>Se connecter</Button>
          )}
        </Box>
        <IconButton
          type="button"
          aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setMobileOpen((open) => !open)}
          sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'inherit' }}
        >
          {mobileOpen ? <CloseIcon /> : <MenuIcon />}
        </IconButton>
      </Toolbar>

      <Box
        sx={{
          display: { xs: 'block', md: 'none' },
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          px: 1.5,
          pb: mobileOpen ? 1.5 : 0,
          maxHeight: mobileOpen ? 520 : 0,
          opacity: mobileOpen ? 1 : 0,
          overflow: 'hidden',
          pointerEvents: mobileOpen ? 'auto' : 'none',
          borderTop: mobileOpen ? '1px solid var(--border-color)' : '1px solid transparent',
          bgcolor: 'var(--surface-bg)',
          boxShadow: mobileOpen ? '0 18px 34px rgba(17, 36, 59, 0.12)' : '0 0 0 rgba(17, 36, 59, 0)',
          transform: mobileOpen ? 'translateY(0) scaleY(1)' : 'translateY(-12px) scaleY(.97)',
          transformOrigin: 'top center',
          transition: 'max-height 280ms cubic-bezier(.2,.85,.25,1), opacity 180ms ease, transform 280ms cubic-bezier(.2,.85,.25,1), padding-bottom 280ms ease, box-shadow 220ms ease, border-color 220ms ease',
        }}
      >
          <Box
            sx={{
              mt: 1.25,
              p: 1.25,
              borderRadius: 2,
              border: '1px solid var(--border-color)',
              bgcolor: 'var(--surface-soft)',
            }}
          >
            <Stack spacing={0.5}>
              {primaryLinks.map((link) => (
                <Button
                  key={link.to}
                  component={RouterLink}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', color: 'inherit', fontWeight: 900, textTransform: 'none' }}
                >
                  {link.label}
                </Button>
              ))}
            </Stack>

            <Divider sx={{ my: 1.25, borderColor: 'var(--border-color)' }} />

            <Stack spacing={0.8}>
              {renderModeToggle(true)}
              {renderThemeButton(true)}
            </Stack>

            <Divider sx={{ my: 1.25, borderColor: 'var(--border-color)' }} />

            <Stack spacing={0.5}>
              {accountLinks.map((link) => (
                <Button
                  key={link.to}
                  component={RouterLink}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', color: 'inherit', fontWeight: 900, textTransform: 'none' }}
                >
                  {link.label}
                </Button>
              ))}
            </Stack>
          </Box>
      </Box>
    </AppBar>
  );
}

export default NavBar;
