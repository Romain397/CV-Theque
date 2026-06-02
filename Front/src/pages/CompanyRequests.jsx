import React, { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Chip, Container, Divider, Paper, Stack, TextField, Typography } from '@mui/material';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import { useAuth } from '../auth';
import { useStudents } from '../hooks/useStudents';
import * as studentsService from '../services/studentsService';
import * as companiesService from '../services/companiesService';
import * as jobsService from '../services/jobsService';
import TagChipsInput from '../components/TagChipsInput';

const initial = (name) => (name?.[0] || 'C').toUpperCase();
const emptyJobDraft = { title: '', description: '', tags: [] };
const isLocalJob = (job) => !job?.externalUrl && String(job?.source || '').toLowerCase() === 'local';

export default function CompanyRequests() {
  const { user } = useAuth();
  const { students, refresh: refreshStudents } = useStudents();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobSaving, setJobSaving] = useState(false);
  const [jobMessage, setJobMessage] = useState(null);
  const [jobDraft, setJobDraft] = useState(emptyJobDraft);
  const [editingJobId, setEditingJobId] = useState(null);

  React.useEffect(() => {
    let mounted = true;
    companiesService.getCompanies().then((items) => {
      if (mounted) setCompanies(Array.isArray(items) ? items : []);
    }).catch(() => {
      if (mounted) setCompanies([]);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const companyId = user?.profile?.companyId || user?.profile?.company?.id || user?.id || null;
  const company = useMemo(
    () => companies.find((item) => String(item.id) === String(companyId)) || null,
    [companies, companyId]
  );
  const companyName = company?.name || user?.name || '';

  const pendingStudents = useMemo(
    () => students.filter((student) => String(student.pendingCompanyId) === String(companyId) && student.pendingCompanyStatus === 'pending'),
    [companyId, students]
  );

  const companyJobs = useMemo(
    () => jobs.filter((job) => (
      isLocalJob(job)
      && (
        String(job.company?.id) === String(companyId)
        || (companyName && String(job.company?.name || '').toLowerCase() === companyName.toLowerCase())
      )
    )),
    [companyId, companyName, jobs]
  );

  const refreshJobs = React.useCallback(async () => {
    setJobsLoading(true);
    try {
      const items = await jobsService.getJobs();
      setJobs(Array.isArray(items) ? items : []);
    } catch (error) {
      setJobMessage({ type: 'error', text: error?.message || 'Impossible de charger les offres.' });
    } finally {
      setJobsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!user || user.role !== 'company') return undefined;

    let mounted = true;
    setJobsLoading(true);
    jobsService.getJobs()
      .then((items) => {
        if (mounted) setJobs(Array.isArray(items) ? items : []);
      })
      .catch((error) => {
        if (mounted) setJobMessage({ type: 'error', text: error?.message || 'Impossible de charger les offres.' });
      })
      .finally(() => {
        if (mounted) setJobsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  const handlePendingCompany = async (studentId, action) => {
    if (!studentId) return;
    setSaving(true);
    setMessage(null);

    try {
      await studentsService.respondPendingCompany(studentId, action);
      await refreshStudents?.();
      setMessage({ type: 'success', text: 'Demande mise à jour.' });
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'Impossible de traiter la demande.' });
    } finally {
      setSaving(false);
    }
  };

  const resetJobForm = () => {
    setEditingJobId(null);
    setJobDraft(emptyJobDraft);
  };

  const startEditJob = (job) => {
    setEditingJobId(job.id);
    setJobDraft({
      title: job.title || '',
      description: job.description || '',
      tags: Array.from(new Set(job.tags || [])),
    });
    setJobMessage(null);
  };

  const handleSaveJob = async (event) => {
    event.preventDefault();
    if (!companyId || !jobDraft.title.trim()) return;

    setJobSaving(true);
    setJobMessage(null);

    const payload = {
      title: jobDraft.title.trim(),
      description: jobDraft.description.trim(),
      tags: Array.from(new Set((jobDraft.tags || []).map((tag) => String(tag).trim()).filter(Boolean))),
      companyId,
    };

    try {
      if (editingJobId) {
        await jobsService.updateJob(editingJobId, payload);
        setJobMessage({ type: 'success', text: 'Offre mise à jour.' });
      } else {
        await jobsService.createJob(payload);
        setJobMessage({ type: 'success', text: 'Offre publiée.' });
      }
      resetJobForm();
      await refreshJobs();
    } catch (error) {
      setJobMessage({ type: 'error', text: error?.message || 'Impossible de sauvegarder l’offre.' });
    } finally {
      setJobSaving(false);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!jobId) return;
    setJobSaving(true);
    setJobMessage(null);

    try {
      await jobsService.deleteJob(jobId);
      setJobMessage({ type: 'success', text: 'Offre supprimée.' });
      if (String(editingJobId) === String(jobId)) resetJobForm();
      await refreshJobs();
    } catch (error) {
      setJobMessage({ type: 'error', text: error?.message || 'Impossible de supprimer l’offre.' });
    } finally {
      setJobSaving(false);
    }
  };

  if (!user || user.role !== 'company') {
    return (
      <Container sx={{ py: 4 }}>
        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid var(--border-color)', bgcolor: 'background.paper' }}>
          <Typography sx={{ fontWeight: 900 }}>Cette page est réservée aux comptes entreprise.</Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>
            Connecte-toi avec un compte entreprise pour voir les demandes à valider.
          </Typography>
          <Button component={RouterLink} to="/login" variant="contained" sx={{ mt: 2, textTransform: 'none', fontWeight: 900 }}>
            Se connecter
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Avatar sx={{ width: 58, height: 58, bgcolor: 'var(--accent-soft)', color: 'var(--accent-strong)', fontWeight: 900 }}>
              {initial(company?.name || user?.name)}
            </Avatar>
            <Box>
              <Typography variant="overline" sx={{ letterSpacing: 2, color: 'var(--text-secondary)', fontWeight: 900 }}>
                Demandes entreprise
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 950 }}>
                Élèves en attente pour {company?.name || user?.name || 'ton entreprise'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                Valide ou refuse les demandes directement depuis cette page dédiée.
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button component={RouterLink} to="/profile" variant="outlined" sx={{ textTransform: 'none', fontWeight: 800 }}>
              Retour au profil
            </Button>
            {company?.id && (
              <Button component={RouterLink} to={`/companies/${company.id}`} variant="outlined" sx={{ textTransform: 'none', fontWeight: 800 }}>
                Voir la fiche publique
              </Button>
            )}
          </Stack>
        </Stack>

        {message && (
          <Alert severity={message.type} sx={{ mt: 2 }}>
            {message.text}
          </Alert>
        )}

        <Box sx={{ mt: 3, display: 'grid', gap: 1.2 }}>
          {pendingStudents.length ? (
            pendingStudents.map((student) => (
              <Paper
                key={student.id}
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'var(--surface-soft)',
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } }}>
                  <Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <BusinessCenterIcon fontSize="small" />
                      <Typography sx={{ fontWeight: 900 }}>
                        {student.firstName} {student.lastName}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                      {student.jobTitle || 'Profil étudiant'} - {student.location || 'Localisation non renseignée'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.4 }}>
                      Compétences: {(student.skills || []).map((skill) => skill?.name || skill).filter(Boolean).join(', ') || 'Aucune'}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      color="success"
                      disabled={saving}
                      onClick={() => handlePendingCompany(student.id, 'approve')}
                      sx={{ textTransform: 'none', fontWeight: 900 }}
                    >
                      Approuver
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      disabled={saving}
                      onClick={() => handlePendingCompany(student.id, 'reject')}
                      sx={{ textTransform: 'none', fontWeight: 900 }}
                    >
                      Refuser
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))
          ) : (
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px dashed', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Typography sx={{ fontWeight: 900 }}>Aucune demande en attente.</Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>
                Quand un étudiant te sélectionne, sa demande apparaît ici pour validation.
              </Typography>
            </Paper>
          )}
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ mt: 3, p: { xs: 3, md: 4 }, borderRadius: 4, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } }}>
          <Box>
            <Typography variant="overline" sx={{ letterSpacing: 2, color: 'var(--text-secondary)', fontWeight: 900 }}>
              Mini dashboard
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 950 }}>
              Offres locales de {companyName || 'ton entreprise'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
              Crée, modifie ou retire les offres proposées par ton entreprise sur GotT.
            </Typography>
          </Box>
          <Chip label={`${companyJobs.length} offre${companyJobs.length > 1 ? 's' : ''}`} sx={{ bgcolor: 'var(--accent-soft)', fontWeight: 900 }} />
        </Stack>

        {jobMessage && (
          <Alert severity={jobMessage.type} sx={{ mt: 2 }}>
            {jobMessage.text}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSaveJob} sx={{ mt: 3, p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'var(--surface-soft)', display: 'grid', gap: 1.4 }}>
          <Typography sx={{ fontWeight: 950 }}>
            {editingJobId ? 'Modifier une offre' : 'Nouvelle offre locale'}
          </Typography>
          <TextField
            label="Titre"
            value={jobDraft.title}
            onChange={(event) => setJobDraft((previous) => ({ ...previous, title: event.target.value }))}
            placeholder="Frontend Developer"
            required
          />
          <TextField
            label="Description"
            value={jobDraft.description}
            onChange={(event) => setJobDraft((previous) => ({ ...previous, description: event.target.value }))}
            placeholder="Conception et développement d'interfaces React."
            multiline
            minRows={3}
          />
          <TagChipsInput
            label="Tags"
            tags={jobDraft.tags || []}
            onChange={(nextTags) => setJobDraft((previous) => ({ ...previous, tags: nextTags }))}
            helperText="Tape un tag puis Entrée."
            placeholder="React, API, Backend"
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button type="submit" variant="contained" disabled={jobSaving || !jobDraft.title.trim()} sx={{ textTransform: 'none', fontWeight: 900 }}>
              {jobSaving ? 'Enregistrement...' : editingJobId ? 'Enregistrer l’offre' : 'Publier l’offre'}
            </Button>
            {editingJobId && (
              <Button type="button" variant="outlined" onClick={resetJobForm} disabled={jobSaving} sx={{ textTransform: 'none', fontWeight: 900 }}>
                Annuler
              </Button>
            )}
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'grid', gap: 1.2 }}>
          {jobsLoading ? (
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px dashed', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Typography sx={{ fontWeight: 900 }}>Chargement des offres...</Typography>
            </Paper>
          ) : companyJobs.length ? (
            companyJobs.map((job) => (
              <Paper key={job.id} elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'var(--surface-soft)' }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 950, fontSize: 18 }}>{job.title}</Typography>
                      <Chip label="Local" size="small" sx={{ bgcolor: 'var(--success-chip-bg)', color: 'var(--success)', border: '1px solid var(--border-color)', fontWeight: 900 }} />
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>
                      {job.company?.name || companyName || 'Entreprise'}{job.company?.location ? ` - ${job.company.location}` : ''}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-primary)', mt: 1 }}>
                      {job.description || 'Aucune description'}
                    </Typography>
                    <Stack direction="row" spacing={0.8} sx={{ mt: 1.2, flexWrap: 'wrap' }}>
                      {(job.tags || []).map((tag) => (
                        <Chip key={tag} label={tag} size="small" sx={{ bgcolor: 'var(--muted-bg)', fontWeight: 800 }} />
                      ))}
                    </Stack>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" disabled={jobSaving} onClick={() => startEditJob(job)} sx={{ textTransform: 'none', fontWeight: 900 }}>
                      Modifier
                    </Button>
                    <Button variant="outlined" color="error" disabled={jobSaving} onClick={() => handleDeleteJob(job.id)} sx={{ textTransform: 'none', fontWeight: 900 }}>
                      Supprimer
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))
          ) : (
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px dashed', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Typography sx={{ fontWeight: 900 }}>Aucune offre locale pour le moment.</Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>
                Les offres créées ici apparaîtront dans la page Offres et seront rattachées à ton entreprise.
              </Typography>
            </Paper>
          )}
        </Box>
      </Paper>
    </Container>
  );
}
