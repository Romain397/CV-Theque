import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Divider,
  Chip,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Paper,
  Select,
  Stack,
  Button,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../auth';
import TagChipsInput from '../components/TagChipsInput';
import SmartMatchBox from '../components/SmartMatchBox';
import * as jobsService from '../services/jobsService';
import { useHideExtraActions } from '../uiSettings';

const normalize = (value) => String(value || '').trim().toLowerCase();
const isScrapedJob = (job) => {
  const source = normalize(job?.source);
  const externalUrl = normalize(job?.externalUrl);
  const id = normalize(job?.id);

  return Boolean(
    externalUrl
    || source.includes('hellowork')
    || id.startsWith('hellowork-')
  );
};
const CompanyLabel = ({ company, fallback = 'Entreprise non renseignée' }) => {
  const name = company?.name || fallback;
  const content = (
    <>
      {name}{company?.location ? ` - ${company.location}` : ''}
    </>
  );

  if (!company?.id || String(company.id).startsWith('hellowork-')) {
    return content;
  }

  return (
    <Link
      component={RouterLink}
      to={`/companies/${company.id}`}
      onClick={(event) => event.stopPropagation()}
      underline="hover"
      sx={{ color: 'var(--accent)', fontWeight: 900 }}
    >
      {content}
    </Link>
  );
};

export default function Jobs() {
  const { user } = useAuth();
  const [hideExtraActions] = useHideExtraActions();
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState('featured');
  const [editingJobId, setEditingJobId] = useState(null);
  const [editDraft, setEditDraft] = useState({ tags: [] });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  const selectedMatchProfile = useMemo(() => {
    if (!user || user.role !== 'student') return null;

    const profile = user.profile || {};
    const skills = Array.isArray(profile.skills)
      ? profile.skills
          .map((skill) => (typeof skill === 'string' ? skill : skill?.name))
          .filter(Boolean)
      : [];

    const education = Array.isArray(profile.education)
      ? profile.education
          .map((item) => (typeof item === 'string' ? item : item?.label || item?.name))
          .filter(Boolean)
      : [];

    const projects = Array.isArray(profile.projects)
      ? profile.projects.map((project) => ({
          name: project?.name || project?.title || '',
          description: project?.description || '',
        }))
      : [];

    return {
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      headline: profile.headline || profile.jobTitle || '',
      jobTitle: profile.jobTitle || '',
      bio: profile.bio || '',
      location: profile.location || '',
      age: profile.age || '',
      schoolName: profile.schoolName || '',
      companyName: profile.companyName || '',
      schoolId: profile.schoolId || '',
      companyId: profile.companyId || '',
      skills,
      education,
      projects,
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setJobs([]);
      setSelectedJob(null);
      return undefined;
    }

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
  }, [user]);

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
      if (hideExtraActions && isScrapedJob(job)) {
        return false;
      }

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
  }, [hideExtraActions, jobs, search, sort, tag]);

  useEffect(() => {
    if (hideExtraActions && isScrapedJob(selectedJob)) {
      setSelectedJob(null);
    }
  }, [hideExtraActions, selectedJob]);

  const canEditJob = (job) => Boolean(
    !job.externalUrl && user && (
      user.role === 'admin' || String(user.profile?.companyId) === String(job.company?.id)
    )
  );

  const openJobDetails = (job) => {
    setSelectedJob(job);
  };

  const closeJobDetails = () => {
    setSelectedJob(null);
  };

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
    <Container sx={{ py: 3, minHeight: '100vh', bgcolor: 'var(--page-bg)', color: 'var(--text-primary)' }}>
      {!user ? (
        <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 4, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'var(--accent-soft)', color: 'var(--text-primary)' }}>
                <LockOutlinedIcon />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 950, fontSize: 22 }}>Offres réservées aux comptes connectés</Typography>
                <Typography sx={{ color: 'var(--text-secondary)', mt: 0.25 }}>
                  La page reste disponible dans la navigation, mais le contenu des offres demande une session ouverte.
                </Typography>
              </Box>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                sx={{ textTransform: 'none', fontWeight: 900 }}
              >
                Se connecter
              </Button>
              <Button
                component={RouterLink}
                to="/"
                variant="outlined"
                sx={{ textTransform: 'none', fontWeight: 900 }}
              >
                Retour aux talents
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ) : (
        <>
          <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 4, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Typography variant="overline" sx={{ color: 'var(--text-secondary)', letterSpacing: 2, fontWeight: 900 }}>
              Offres d’emploi
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 950, mt: 0.5 }}>
              Rechercher des offres par mot-clé ou tag
            </Typography>
            <Typography sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>
              Les tags viennent des offres et des expertises de l’entreprise, pour garder une recherche cohérente avec les profils étudiants.
            </Typography>

            {error && (
              <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: 'rgba(180, 35, 24, 0.08)', color: 'var(--error, #b42318)', border: '1px solid', borderColor: 'error.light' }}>
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
                  sx={{ bgcolor: 'var(--accent-soft)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontWeight: 800 }}
                />
              ))}
            </Stack>
          </Paper>

          <Box sx={{ mt: 2, display: 'grid', gap: 1.4 }}>
            <Typography sx={{ fontWeight: 900 }}>
              {visibleJobs.length} offre{visibleJobs.length > 1 ? 's' : ''}
            </Typography>

            {visibleJobs.map((job) => (
              <Paper
                key={job.id}
                elevation={0}
                role="button"
                tabIndex={0}
                onClick={() => openJobDetails(job)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openJobDetails(job);
                  }
                }}
                sx={{
                  p: 2.4,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  cursor: 'pointer',
                  transition: 'border-color 120ms ease, transform 120ms ease, box-shadow 120ms ease',
                  '&:hover': {
                    borderColor: 'var(--border-color)',
                    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)',
                    transform: 'translateY(-1px)',
                  },
                  '&:focus-visible': {
                    outline: '3px solid var(--accent-soft)',
                    outlineOffset: '2px',
                  },
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: 20, fontWeight: 950 }}>{job.title}</Typography>
                      {job.source && (
                        <Chip label={job.source} size="small" sx={{ bgcolor: 'var(--success-chip-bg)', color: 'var(--success)', border: '1px solid var(--border-color)', fontWeight: 900 }} />
                      )}
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>
                      <CompanyLabel company={job.company} />
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 1.2 }}>
                      {job.description || 'Aucune description'}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'var(--text-secondary)', mt: 1.4, fontWeight: 800 }}>
                      Cliquer pour voir le détail
                    </Typography>
                  </Box>

                  <Stack direction="row" gap={0.8} sx={{ alignSelf: 'start', flexWrap: 'wrap' }}>
                    {(job.tags || []).map((item) => (
                      <Chip key={item} label={item} size="small" sx={{ bgcolor: 'var(--muted-bg)', fontWeight: 800 }} />
                    ))}
                    {(job.company?.specialties || []).slice(0, 2).map((item) => (
                      <Chip key={item} label={item} size="small" sx={{ bgcolor: 'var(--accent-soft)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontWeight: 800 }} />
                    ))}
                  </Stack>
                </Stack>

                {canEditJob(job) && (
                  <Box
                    sx={{ mt: 2, p: 2, borderRadius: 3, bgcolor: 'var(--surface-soft)', border: '1px solid', borderColor: 'divider' }}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
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
                          <Box sx={{ mt: 1.2, p: 1.2, borderRadius: 2, bgcolor: saveMessage.type === 'success' ? 'var(--success-chip-bg)' : 'var(--error-chip-bg)', color: saveMessage.type === 'success' ? 'var(--success)' : 'var(--error)' }}>
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
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px dashed var(--border-color)' }}>
                <Typography sx={{ fontWeight: 900 }}>Aucune offre ne correspond à la recherche.</Typography>
              </Paper>
            )}
          </Box>
        </>
      )}

      <Dialog open={Boolean(selectedJob)} onClose={closeJobDetails} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pr: 6 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 950, fontSize: 22 }}>{selectedJob?.title || ''}</Typography>
            {selectedJob?.source && (
              <Chip label={selectedJob.source} size="small" sx={{ bgcolor: 'var(--success-chip-bg)', color: 'var(--success)', border: '1px solid var(--border-color)', fontWeight: 900 }} />
            )}
          </Stack>
          <IconButton
            aria-label="Fermer"
            onClick={closeJobDetails}
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {selectedJob && (() => {
            const details = selectedJob.details || {};
            const metadata = [
              selectedJob.company?.location || details.location?.label,
              details.contract,
              details.salary,
              Array.isArray(details.educationRequirements) ? details.educationRequirements.join(' • ') : null,
              details.industry,
              selectedJob.publishedAt ? `Publiée ${selectedJob.publishedAt}` : null,
            ].filter(Boolean);

            return (
              <Stack spacing={1.5}>
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                  <CompanyLabel company={selectedJob.company} fallback={details.company?.name || 'Entreprise non renseignée'} />
                </Typography>

                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {(selectedJob.tags || []).map((item) => (
                      <Chip key={item} label={item} size="small" sx={{ bgcolor: 'var(--muted-bg)', fontWeight: 800 }} />
                  ))}
                  {(selectedJob.company?.specialties || []).map((item) => (
                    <Chip key={item} label={item} size="small" sx={{ bgcolor: 'var(--accent-soft)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontWeight: 800 }} />
                  ))}
                </Stack>

                {metadata.length > 0 && (
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    {metadata.map((item) => (
                      <Chip key={item} label={item} size="small" variant="outlined" sx={{ fontWeight: 800 }} />
                    ))}
                  </Stack>
                )}

                <SmartMatchBox
                  job={selectedJob}
                  profile={selectedMatchProfile}
                />

                <Divider sx={{ my: 0.5 }} />

                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                  Le job
                </Typography>
                <Typography sx={{ whiteSpace: 'pre-line', color: 'var(--text-primary)', lineHeight: 1.7 }}>
                  {details.summary || selectedJob.description || 'Aucune description'}
                </Typography>

                {Array.isArray(details.sections) && details.sections.length > 0 && (
                  <Stack spacing={1.5} sx={{ pt: 0.5 }}>
                    {details.sections.map((section) => (
                      <Box key={section.title}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.5 }}>
                          {section.title}
                        </Typography>
                        <Typography sx={{ whiteSpace: 'pre-line', color: 'var(--text-primary)', lineHeight: 1.7 }}>
                          {section.body}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}

                {(details.location?.streetAddress || details.location?.label) && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.5 }}>
                      La carte
                    </Typography>
                    <Typography sx={{ whiteSpace: 'pre-line', color: 'var(--text-primary)', lineHeight: 1.7 }}>
                      {details.location?.streetAddress || details.location?.label}
                      {details.location?.postalCode || details.location?.city ? `\n${details.location?.postalCode || ''} ${details.location?.city || ''}`.trim() : ''}
                    </Typography>
                  </Box>
                )}

                {details.company?.description && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.5 }}>
                      L'entreprise
                    </Typography>
                    <Typography sx={{ whiteSpace: 'pre-line', color: 'var(--text-primary)', lineHeight: 1.7 }}>
                      {details.company.description}
                    </Typography>
                  </Box>
                )}

                {details.recruitment && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.5 }}>
                      Les étapes de recrutement
                    </Typography>
                    <Typography sx={{ whiteSpace: 'pre-line', color: 'var(--text-primary)', lineHeight: 1.7 }}>
                      {details.recruitment}
                    </Typography>
                  </Box>
                )}
              </Stack>
            );
          })()}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeJobDetails} variant="outlined" sx={{ textTransform: 'none', fontWeight: 900 }}>
            Fermer
          </Button>
          {selectedJob?.externalUrl && !hideExtraActions && (
            <Button
              href={selectedJob.externalUrl}
              target="_blank"
              rel="noreferrer"
              variant="contained"
              startIcon={<OpenInNewOutlinedIcon />}
              sx={{ textTransform: 'none', fontWeight: 900 }}
            >
              Postuler sur la plateforme
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}
