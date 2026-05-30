import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Button,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../auth';
import TagChipsInput from '../components/TagChipsInput';
import * as jobsService from '../services/jobsService';

const normalize = (value) => String(value || '').trim().toLowerCase();

export default function Jobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState('featured');
  const [editingJobId, setEditingJobId] = useState(null);
  const [editDraft, setEditDraft] = useState({ tags: [] });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    let mounted = true;

    jobsService.getJobs()
      .then((data) => {
        if (mounted) {
          setJobs(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(String(err));
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const availableTags = useMemo(() => {
    const pool = jobs.flatMap((job) => [
      ...(job.tags || []),
      ...(job.company?.specialties || []),
    ]);

    return Array.from(new Set(pool)).sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const visibleJobs = useMemo(() => {
    const normalizedSearch = normalize(search);

    const filtered = jobs.filter((job) => {
      const haystack = [
        job.title,
        job.description,
        job.company?.name,
        job.company?.location,
        ...(job.tags || []),
        ...(job.company?.specialties || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      const matchesTag = !tag || (job.tags || []).some((item) => normalize(item).includes(normalize(tag)))
        || (job.company?.specialties || []).some((item) => normalize(item).includes(normalize(tag)));

      return matchesSearch && matchesTag;
    });

    if (sort === 'title') {
      return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    }

    return filtered;
  }, [jobs, search, sort, tag]);

  const canEditJob = (job) => Boolean(
    user && (
      user.role === 'admin' || String(user.profile?.companyId) === String(job.company?.id)
    )
  );

  const startEditing = (job) => {
    setEditingJobId(job.id);
    setEditDraft({ tags: Array.from(new Set(job.tags || [])) });
    setSaveMessage(null);
  };

  const stopEditing = () => {
    setEditingJobId(null);
    setEditDraft({ tags: [] });
    setSaveMessage(null);
  };

  const saveJobTags = async (job) => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const updatedJob = await jobsService.updateJob(job.id, {
        title: job.title,
        description: job.description,
        companyId: job.company?.id || '',
        tags: editDraft.tags || [],
      });

      setJobs((previous) => previous.map((item) => (item.id === job.id ? updatedJob : item)));
      setEditingJobId(null);
      setEditDraft({ tags: [] });
      setSaveMessage({ type: 'success', text: 'Tags de l’offre enregistrés.' });
    } catch (error) {
      setSaveMessage({ type: 'error', text: error?.message || 'Impossible de sauvegarder les tags.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container sx={{ py: 3 }}>
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 4, border: '1px solid #e5ebf1' }}>
        <Typography variant="overline" sx={{ color: '#7b8794', letterSpacing: 2, fontWeight: 900 }}>
          Offres d’emploi
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 950, mt: 0.5 }}>
          Rechercher des offres par mot-clé ou tag
        </Typography>
        <Typography sx={{ color: '#607287', mt: 0.5 }}>
          Les tags viennent des offres et des expertises de l’entreprise, pour garder une recherche cohérente avec les profils étudiants.
        </Typography>

        {error && (
          <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: '#fff5f5', color: '#b42318', border: '1px solid #f2c7c7' }}>
            <Typography sx={{ fontWeight: 800 }}>{error}</Typography>
          </Box>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.5fr 1fr 1fr' }, gap: 1.2, mt: 2 }}>
          <TextField
            label="Recherche"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="React, API, UX, Paris..."
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Tag</InputLabel>
            <Select label="Tag" value={tag} onChange={(event) => setTag(event.target.value)}>
              <MenuItem value="">Tous</MenuItem>
              {availableTags.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Trier</InputLabel>
            <Select label="Trier" value={sort} onChange={(event) => setSort(event.target.value)}>
              <MenuItem value="featured">Mis en avant</MenuItem>
              <MenuItem value="title">Par titre</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
          {availableTags.slice(0, 10).map((item) => (
            <Chip
              key={item}
              label={item}
              onClick={() => setTag(item)}
              clickable
              sx={{ bgcolor: '#eef4fb', fontWeight: 800 }}
            />
          ))}
        </Stack>
      </Paper>

      <Box sx={{ mt: 2, display: 'grid', gap: 1.4 }}>
        <Typography sx={{ fontWeight: 900 }}>
          {visibleJobs.length} offre{visibleJobs.length > 1 ? 's' : ''}
        </Typography>

        {visibleJobs.map((job) => (
          <Paper key={job.id} elevation={0} sx={{ p: 2.4, borderRadius: 3, border: '1px solid #e5ebf1', bgcolor: '#fff' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{ fontSize: 20, fontWeight: 950 }}>{job.title}</Typography>
                <Typography variant="body2" sx={{ color: '#607287', mt: 0.5 }}>
                  {job.company?.name || 'Entreprise non renseignée'}{job.company?.location ? ` - ${job.company.location}` : ''}
                </Typography>
                <Typography variant="body2" sx={{ color: '#607287', mt: 1.2 }}>
                  {job.description || 'Aucune description'}
                </Typography>
              </Box>

              <Stack direction="row" gap={0.8} sx={{ alignSelf: 'start', flexWrap: 'wrap' }}>
                {(job.tags || []).map((item) => (
                  <Chip key={item} label={item} size="small" sx={{ bgcolor: '#f5efe2', fontWeight: 800 }} />
                ))}
                {(job.company?.specialties || []).slice(0, 2).map((item) => (
                  <Chip key={item} label={item} size="small" sx={{ bgcolor: '#eef4fb', fontWeight: 800 }} />
                ))}
              </Stack>
            </Stack>

            {canEditJob(job) && (
              <Box sx={{ mt: 2, p: 2, borderRadius: 3, bgcolor: '#f8fbfe', border: '1px solid #e5ebf1' }}>
                {editingJobId === job.id ? (
                  <Box>
                    <TagChipsInput
                      label="Tags de l’offre"
                      tags={editDraft.tags || []}
                      onChange={(nextTags) => setEditDraft((previous) => ({ ...previous, tags: nextTags }))}
                      helperText="Tape un tag puis Entrée. Supprime avec la croix au survol."
                      placeholder="React, API, Backend"
                    />
                    {saveMessage && (
                      <Box sx={{ mt: 1.2, p: 1.2, borderRadius: 2, bgcolor: saveMessage.type === 'success' ? '#ecfdf3' : '#fff5f5', color: saveMessage.type === 'success' ? '#027a48' : '#b42318' }}>
                        <Typography sx={{ fontWeight: 800 }}>{saveMessage.text}</Typography>
                      </Box>
                    )}
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                      <Button size="small" variant="contained" onClick={() => saveJobTags(job)} disabled={saving} sx={{ textTransform: 'none', fontWeight: 900 }}>
                        {saving ? 'Enregistrement...' : 'Enregistrer les tags'}
                      </Button>
                      <Button size="small" variant="outlined" onClick={stopEditing} sx={{ textTransform: 'none', fontWeight: 900 }}>
                        Annuler
                      </Button>
                    </Stack>
                  </Box>
                ) : (
                  <Button size="small" variant="outlined" onClick={() => startEditing(job)} sx={{ textTransform: 'none', fontWeight: 900 }}>
                    Modifier les tags
                  </Button>
                )}
              </Box>
            )}
          </Paper>
        ))}

        {!error && visibleJobs.length === 0 && (
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px dashed #cbd5df' }}>
            <Typography sx={{ fontWeight: 900 }}>Aucune offre ne correspond à la recherche.</Typography>
          </Paper>
        )}
      </Box>
    </Container>
  );
}