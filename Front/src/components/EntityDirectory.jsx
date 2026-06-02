import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PublicIcon from '@mui/icons-material/Public';

const getInitial = (name, fallback) => (name?.[0] || fallback || '?').toUpperCase();
const getLocations = (entity) =>
  (Array.isArray(entity.locations) && entity.locations.length ? entity.locations : [entity.location])
    .map((location) => `${location || ''}`.trim())
    .filter(Boolean);

export function EntityDirectory({
  title,
  eyebrow,
  intro,
  entities,
  profileByEntity,
  profileRoute,
  searchPlaceholder,
  emptyLabel,
  error,
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');

  const visibleEntities = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = entities.filter((entity) => {
      const profile = profileByEntity(entity);
      const searchBase = [
        entity.name,
        entity.location,
        ...(entity.locations || []),
        profile.tagline,
        profile.summary,
        ...(profile.specialties || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return !normalizedSearch || searchBase.includes(normalizedSearch);
    });

    if (sort === 'name') {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }

    if (sort === 'location') {
      return [...filtered].sort((a, b) => ((a.locations || [a.location])[0] || '').localeCompare((b.locations || [b.location])[0] || ''));
    }

    return filtered;
  }, [entities, profileByEntity, search, sort]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'var(--page-bg)', py: 3 }}>
      <Box sx={{ maxWidth: 1240, mx: 'auto', px: { xs: 2, md: 3 } }}>
        <Paper
          elevation={0}
          sx={{
            overflow: 'hidden',
            borderRadius: 4,
            bgcolor: 'var(--accent)',
            color: '#fff',
            boxShadow: '0 24px 60px rgba(17, 36, 59, 0.14)',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' },
              gap: 3,
              p: { xs: 3, md: 4 },
              background: 'linear-gradient(135deg, var(--accent) 0%, #2b79c2 100%)',
            }}
          >
            <Box>
              <Typography variant="overline" sx={{ letterSpacing: 3, opacity: 0.75 }}>
                {eyebrow}
              </Typography>
              <Typography component="h1" sx={{ mt: 1, fontSize: { xs: 34, md: 46 }, lineHeight: 0.98, fontWeight: 950 }}>
                {title}
              </Typography>
              <Typography sx={{ mt: 2, maxWidth: 620, color: 'rgba(255,255,255,.78)' }}>
                {intro}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={() => document.getElementById('directory-search')?.focus()}
                  sx={{
                    bgcolor: '#ffc21c',
                    color: 'var(--text-primary)',
                    borderRadius: 99,
                    px: 2.4,
                    fontWeight: 900,
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#ffcd3d' },
                  }}
                >
                  Rechercher
                </Button>
                <Button
                  variant="outlined"
                  component={RouterLink}
                  to="/"
                  sx={{
                    borderColor: 'rgba(255,255,255,.72)',
                    color: '#fff',
                    borderRadius: 99,
                    px: 2.4,
                    fontWeight: 800,
                    textTransform: 'none',
                  }}
                >
                  Retour aux talents
                </Button>
              </Stack>
            </Box>

            <Stack spacing={1.2}>
              <Paper elevation={0} sx={{ p: 2.2, borderRadius: 2, bgcolor: 'rgba(255,255,255,.12)', color: '#fff' }}>
                <Typography variant="overline" sx={{ color: '#ffc21c', fontWeight: 900, letterSpacing: 2 }}>
                  Annuaire
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.76)' }}>
                  Les fiches sont consultables, recherchables et reliées à une page profil détaillée.
                </Typography>
              </Paper>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,.12)', color: '#fff' }}>
                <Typography sx={{ fontSize: 28, lineHeight: 1, fontWeight: 950 }}>{visibleEntities.length}</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.7)', fontWeight: 800 }}>
                  profils disponibles
                </Typography>
              </Paper>
            </Stack>
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, mt: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' } }}>
            <Box>
              <Typography variant="overline" sx={{ color: 'var(--text-secondary)', letterSpacing: 2, fontWeight: 900 }}>
                Recherche
              </Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 900 }}>{visibleEntities.length} résultats</Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                Filtrez par nom, ville, spécialités ou accroche.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ minWidth: { md: 430 } }}>
              <TextField
                id="directory-search"
                size="small"
                fullWidth
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
              />
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Trier</InputLabel>
                <Select label="Trier" value={sort} onChange={(e) => setSort(e.target.value)}>
                  <MenuItem value="featured">Mis en avant</MenuItem>
                  <MenuItem value="name">Nom</MenuItem>
                  <MenuItem value="location">Ville</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </Paper>

        {error && (
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, mt: 2, border: '1px solid', borderColor: 'error.light', bgcolor: 'rgba(180, 35, 24, 0.08)' }}>
            <Typography sx={{ fontWeight: 800, color: 'var(--error, #b42318)' }}>{error}</Typography>
          </Paper>
        )}

        <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.2 }}>
          {[
            ['Entrées', entities.length],
            ['Résultats', visibleEntities.length],
            ['Accès profil', 'Oui'],
            ['Réseaux', 'Inclus'],
          ].map(([label, value]) => (
            <Paper key={label} elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="overline" sx={{ color: 'var(--text-secondary)', letterSpacing: 2, fontWeight: 900 }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: 28, lineHeight: 1, fontWeight: 950, color: 'var(--text-primary)', mt: 0.5 }}>
                {value}
              </Typography>
            </Paper>
          ))}
        </Box>

        {visibleEntities.length === 0 ? (
          <Paper elevation={0} sx={{ p: 4, mt: 2, textAlign: 'center', border: '1px dashed var(--border-color)' }}>
            <Typography sx={{ fontWeight: 900 }}>{emptyLabel}</Typography>
          </Paper>
        ) : (
          <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.6 }}>
            {visibleEntities.map((entity) => {
              const profile = profileByEntity(entity);
              const specialties = profile.specialties?.slice(0, 3) || [];
              const locations = getLocations(entity);

              return (
                <Paper
                  key={entity.id}
                  component={RouterLink}
                  to={profileRoute(entity)}
                  elevation={0}
                  sx={{
                    p: 2.4,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    textDecoration: 'none',
                    color: 'inherit',
                    boxShadow: '0 10px 28px rgba(17, 36, 59, 0.08)',
                    transition: 'transform .2s ease, box-shadow .2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 16px 36px rgba(17, 36, 59, 0.12)',
                    },
                  }}
                >
                  <Stack direction="row" spacing={1.6} sx={{ alignItems: 'flex-start' }}>
                    <Avatar sx={{ width: 44, height: 44, bgcolor: 'var(--accent-soft)', color: 'var(--accent-strong)', fontWeight: 900 }}>
                      {getInitial(entity.name, emptyLabel[0] || 'A')}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.6 }}>
                        <Stack direction="row" gap={0.6} sx={{ alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
                          {locations.length ? (
                            locations.slice(0, 2).map((location) => (
                              <Chip key={location} label={location} size="small" sx={{ height: 20, maxWidth: 220, bgcolor: 'var(--surface-soft)', fontSize: 10, fontWeight: 800 }} />
                            ))
                          ) : (
                            <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 800 }}>
                              Localisation non précisée
                            </Typography>
                          )}
                          {locations.length > 2 && (
                            <Chip label={`+${locations.length - 2}`} size="small" sx={{ height: 20, bgcolor: 'var(--muted-bg)', fontSize: 10, fontWeight: 900 }} />
                          )}
                        </Stack>
                        <Chip label="Profil détaillé" size="small" sx={{ height: 18, borderRadius: 99, bgcolor: '#ffbf18', color: 'var(--text-primary)', fontSize: 10, fontWeight: 900 }} />
                      </Stack>
                      <Typography sx={{ color: 'var(--text-primary)', fontWeight: 900, lineHeight: 1.1, fontSize: 18 }}>
                        {entity.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.4 }}>
                        {profile.tagline}
                      </Typography>
                    </Box>
                  </Stack>

                  <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 1.4, minHeight: 48 }}>
                    {profile.summary}
                  </Typography>

                  <Stack direction="row" gap={0.8} sx={{ flexWrap: 'wrap', mt: 1.6 }}>
                    {specialties.map((item) => (
                      <Chip key={item} label={item} size="small" sx={{ borderRadius: 99, bgcolor: 'var(--muted-bg)', color: 'var(--text-primary)', fontSize: 11, fontWeight: 700, border: '1px solid var(--muted-border)' }} />
                    ))}
                  </Stack>

                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Button
                      size="small"
                      endIcon={<PublicIcon />}
                      sx={{ px: 0, minWidth: 'auto', color: 'var(--accent)', fontSize: 12, fontWeight: 900, textTransform: 'none' }}
                    >
                      Voir le profil complet
                    </Button>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                      Réseaux et détails inclus
                    </Typography>
                  </Stack>
                </Paper>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
