import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../auth';
import TagChipsInput from '../components/TagChipsInput';
import * as studentsService from '../services/studentsService';
import * as schoolsService from '../services/schoolsService';
import * as companiesService from '../services/companiesService';
import * as jobsService from '../services/jobsService';

const roleLabel = (role) => {
  if (role === 'student') return 'Étudiant';
  if (role === 'school') return 'École';
  if (role === 'company') return 'Entreprise';
  if (role === 'admin') return 'Administrateur';
  return role;
};

const tagsToList = (tags = []) =>
  Array.from(
    new Set(
      (tags || [])
        .map((tag) => (typeof tag === 'string' ? tag : tag?.name))
        .filter(Boolean)
    )
  );

const skillsToPayload = (tags = []) => tags.map((name) => ({ name, level: 'Intermédiaire' }));

export default function Profile() {
  const { user, logout, updateUserRecord, refreshUser } = useAuth();
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [accountDraft, setAccountDraft] = useState({ displayName: '', headline: '', bio: '' });
  const [entityDraft, setEntityDraft] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const entityType = useMemo(() => {
    if (!user) return null;
    if (user.role === 'student') return 'student';
    if (user.role === 'school') return 'school';
    if (user.role === 'company') return 'company';
    return null;
  }, [user]);

  const selectedCollection = useMemo(() => {
    if (entityType === 'student') return students;
    if (entityType === 'school') return schools;
    if (entityType === 'company') return companies;
    return [];
  }, [companies, entityType, schools, students]);

  const selectedEntity = useMemo(
    () => selectedCollection.find((item) => String(item.id) === String(selectedEntityId)) || null,
    [selectedCollection, selectedEntityId]
  );

  const sharedTags = useMemo(() => {
    const pool = [
      ...students.flatMap((student) => (student.skills || []).map((skill) => skill?.name).filter(Boolean)),
      ...schools.flatMap((school) => school.specialties || []),
      ...companies.flatMap((company) => company.specialties || []),
      ...jobs.flatMap((job) => job.tags || []),
    ];

    return Array.from(new Set(pool)).slice(0, 12);
  }, [companies, jobs, schools, students]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      studentsService.getStudents().catch(() => []),
      schoolsService.getSchools().catch(() => []),
      companiesService.getCompanies().catch(() => []),
      jobsService.getJobs().catch(() => []),
    ])
      .then(([studentItems, schoolItems, companyItems, jobItems]) => {
        if (!mounted) return;

        setStudents(Array.isArray(studentItems) ? studentItems : []);
        setSchools(Array.isArray(schoolItems) ? schoolItems : []);
        setCompanies(Array.isArray(companyItems) ? companyItems : []);
        setJobs(Array.isArray(jobItems) ? jobItems : []);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    setAccountDraft({
      displayName: user.name || '',
      headline: user.profile?.headline || '',
      bio: user.profile?.bio || '',
    });
  }, [user]);

  useEffect(() => {
    if (!entityType) return;

    // For students, the account IS the public profile: bind to current user id
    if (entityType === 'student') {
      setSelectedEntityId(String(user.id));
      return;
    }

    if (!selectedCollection.length) return;

    const bindingKey = entityType === 'school' ? 'schoolId' : 'companyId';
    const persistedId = user?.profile?.[bindingKey];
    const fallbackId = selectedCollection[0]?.id;

    setSelectedEntityId(String(persistedId || fallbackId || ''));
  }, [entityType, selectedCollection, user]);

  useEffect(() => {
    if (entityType === 'student') {
      // use current user's profile as the editable entity
      const p = user.profile || {};
      setEntityDraft({
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        age: p.age ?? '',
        jobTitle: p.jobTitle || '',
        location: p.location || '',
        schoolId: p.schoolId || '',
        companyId: p.companyId || '',
        skillsTags: tagsToList(p.skills || []),
        pendingSchoolId: p.pendingSchoolId || null,
        pendingSchoolStatus: p.pendingSchoolStatus || null,
        pendingCompanyId: p.pendingCompanyId || null,
        pendingCompanyStatus: p.pendingCompanyStatus || null,
      });
      return;
    }

    if (!selectedEntity) {
      setEntityDraft({});
      return;
    }

    if (entityType === 'school' || entityType === 'company') {
      setEntityDraft({
        name: selectedEntity.name || '',
        location: selectedEntity.location || '',
        specialtiesTags: tagsToList(selectedEntity.specialties || []),
      });
    }
  }, [entityType, selectedEntity]);

  // Poll backend to detect when a pending company request has been processed.
  useEffect(() => {
    if (entityType !== 'student') return undefined;
    const pendingCompanyId = entityDraft?.pendingCompanyId;
    const pendingCompanyStatus = entityDraft?.pendingCompanyStatus;
    if (!pendingCompanyId || pendingCompanyStatus !== 'pending') return undefined;

    let mounted = true;
    const interval = setInterval(async () => {
      try {
        const updated = await refreshUser();
        if (!mounted) return;
        if (updated && updated.profile) {
          // if the pendingCompanyId was removed or status changed, stop polling
          const p = updated.profile || {};
          if (!p.pendingCompanyId || (p.pendingCompanyStatus && p.pendingCompanyStatus !== 'pending')) {
            setEntityDraft((prev) => ({ ...prev, pendingCompanyId: p.pendingCompanyId || null, pendingCompanyStatus: p.pendingCompanyStatus || null, companyId: p.companyId || prev.companyId }));
            setMessage({ type: 'success', text: 'Mise à jour reçue : le statut de votre demande a changé.' });
            // also refresh local students list to reflect company assignment
            const refreshedStudents = await studentsService.getStudents().catch(() => null);
            if (refreshedStudents) setStudents(refreshedStudents);
            clearInterval(interval);
          }
        }
      } catch (e) {
        // ignore network errors, continue polling
      }
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [entityType, entityDraft?.pendingCompanyId, entityDraft?.pendingCompanyStatus, refreshUser]);

  const bindingKey = entityType === 'student' ? 'studentId' : entityType === 'school' ? 'schoolId' : entityType === 'company' ? 'companyId' : null;

  const handleEntityFieldChange = (name, value) => {
    setEntityDraft((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const pendingRequests = useMemo(() => {
    if (!selectedEntity) return [];
    if (entityType === 'school') {
      return (students || []).filter((s) => String(s.pendingSchoolId) === String(selectedEntity.id) && s.pendingSchoolStatus === 'pending');
    }
    if (entityType === 'company') {
      return (students || []).filter((s) => String(s.pendingCompanyId) === String(selectedEntity.id) && s.pendingCompanyStatus === 'pending');
    }
    return [];
  }, [students, selectedEntity, entityType]);

  const handleRespondPending = async (studentId, action) => {
    if (!studentId) return;
    setSaving(true);
    setMessage(null);
    try {
      if (entityType === 'school') {
        await studentsService.respondPendingSchool(studentId, action);
      } else if (entityType === 'company') {
        await studentsService.respondPendingCompany(studentId, action);
      }
      const refreshed = await studentsService.getStudents();
      setStudents(refreshed || []);
      setMessage({ type: 'success', text: 'Action enregistrée.' });
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Impossible d’effectuer l’action.' });
    } finally {
      setSaving(false);
    }
  };

  const addSharedTag = (tag) => {
    if (!tag) return;

    if (entityType === 'student') {
      setEntityDraft((previous) => ({
        ...previous,
        skillsTags: Array.from(new Set([...(previous.skillsTags || []), tag])),
      }));
      return;
    }

    if (entityType === 'school' || entityType === 'company') {
      setEntityDraft((previous) => ({
        ...previous,
        specialtiesTags: Array.from(new Set([...(previous.specialtiesTags || []), tag])),
      }));
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!user) return;
    if (!entityType || !selectedEntityId) {
      setMessage({ type: 'error', text: 'Aucun profil public n’est lié à ce compte.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      let updatedEntity = null;
      let nextAccountName = accountDraft.displayName || user.name;

      if (entityType === 'student') {
        // update the user's own profile directly
        const targetId = String(user.id);
        const payload = {
          firstName: entityDraft.firstName || '',
          lastName: entityDraft.lastName || '',
          age: Number(entityDraft.age || 0),
          jobTitle: entityDraft.jobTitle || '',
          location: entityDraft.location || '',
          schoolId: entityDraft.schoolId || '',
          companyId: entityDraft.companyId || '',
          skills: skillsToPayload(entityDraft.skillsTags || []),
        };
        // if a new school or company was requested, send them as pending fields inside profile
        if (entityDraft.pendingSchoolId || entityDraft.pendingCompanyId) {
          payload.profile = {
            ...(entityDraft.pendingSchoolId ? { pendingSchoolId: entityDraft.pendingSchoolId, pendingSchoolStatus: 'pending' } : {}),
            ...(entityDraft.pendingCompanyId ? { pendingCompanyId: entityDraft.pendingCompanyId, pendingCompanyStatus: 'pending' } : {}),
          };
        }
        updatedEntity = await studentsService.updateStudent(targetId, payload);

        nextAccountName = `${updatedEntity.firstName || ''} ${updatedEntity.lastName || ''}`.trim() || nextAccountName;
      }

      if (entityType === 'school') {
        updatedEntity = await schoolsService.updateSchool(selectedEntityId, {
          name: entityDraft.name || '',
          location: entityDraft.location || '',
          specialties: entityDraft.specialtiesTags || [],
        });

        nextAccountName = updatedEntity.name || nextAccountName;
      }

      if (entityType === 'company') {
        updatedEntity = await companiesService.updateCompany(selectedEntityId, {
          name: entityDraft.name || '',
          location: entityDraft.location || '',
          specialties: entityDraft.specialtiesTags || [],
        });

        nextAccountName = updatedEntity.name || nextAccountName;
      }

      updateUserRecord(user.id, (record) => {
        const baseProfile = {
          ...(record.profile || {}),
          displayName: accountDraft.displayName || nextAccountName,
          headline: accountDraft.headline || '',
          bio: accountDraft.bio || '',
        };

        // If student, merge updatedEntity fields into profile
        const mergedProfile = entityType === 'student' && updatedEntity
          ? {
              ...baseProfile,
              firstName: updatedEntity.firstName || baseProfile.firstName || '',
              lastName: updatedEntity.lastName || baseProfile.lastName || '',
              age: updatedEntity.age || baseProfile.age || 0,
              jobTitle: updatedEntity.jobTitle || baseProfile.jobTitle || '',
              location: updatedEntity.location || baseProfile.location || '',
              skills: updatedEntity.skills || baseProfile.skills || [],
              schoolId: updatedEntity.schoolId || baseProfile.schoolId || '',
              companyId: updatedEntity.companyId || baseProfile.companyId || '',
            }
          : baseProfile;

        // reflect pending fields if present (school + company)
        if (entityType === 'student' && updatedEntity && updatedEntity.profile && mergedProfile) {
          mergedProfile.pendingSchoolId = updatedEntity.profile.pendingSchoolId || baseProfile.pendingSchoolId || null;
          mergedProfile.pendingSchoolStatus = updatedEntity.profile.pendingSchoolStatus || baseProfile.pendingSchoolStatus || null;
          mergedProfile.pendingCompanyId = updatedEntity.profile.pendingCompanyId || baseProfile.pendingCompanyId || null;
          mergedProfile.pendingCompanyStatus = updatedEntity.profile.pendingCompanyStatus || baseProfile.pendingCompanyStatus || null;
        }

        return {
          ...record,
          name: nextAccountName,
          profile: mergedProfile,
        };
      });

      refreshUser();
      setMessage({ type: 'success', text: 'Profil enregistré et tags rendus disponibles dans les recherches.' });
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'Impossible d’enregistrer le profil.' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <Container sx={{ py: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography>Connecte-toi pour voir ton profil.</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4 }}>
      <Box sx={{ display: 'grid', gap: 2.4 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 4,
            bgcolor: '#214a71',
            color: '#fff',
            boxShadow: '0 22px 50px rgba(17, 36, 59, 0.18)',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } }}>
            <Box>
              <Typography variant="overline" sx={{ letterSpacing: 3, opacity: 0.75 }}>
                Mon espace
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 950, mt: 1 }}>
                {accountDraft.displayName || user.name}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,.8)', mt: 0.5 }}>
                {roleLabel(user.role)} - {user.email}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip label={user.approved ? 'Compte validé' : 'En attente'} sx={{ bgcolor: '#fff', fontWeight: 900 }} />
              <Button variant="outlined" onClick={logout} sx={{ borderColor: 'rgba(255,255,255,.45)', color: '#fff', textTransform: 'none' }}>
                Se déconnecter
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {message && <Alert severity={message.type}>{message.text}</Alert>}

        <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3, border: '1px solid #e5ebf1' }}>
          <Typography variant="overline" sx={{ color: '#7b8794', letterSpacing: 2, fontWeight: 900 }}>
            Profil privé
          </Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 900, mt: 0.5 }}>Ce que les autres voient sur ta fiche</Typography>
          <Typography variant="body2" sx={{ color: '#607287', mt: 0.5 }}>
            Les tags ajoutés ici sont réutilisables ailleurs dans l’application pour la recherche par compétence.
          </Typography>

          <Box component="form" onSubmit={handleSave} sx={{ mt: 2.5 }}>
            <Stack spacing={2}>
              <TextField
                label="Nom affiché"
                value={accountDraft.displayName}
                onChange={(event) => setAccountDraft((previous) => ({ ...previous, displayName: event.target.value }))}
                fullWidth
              />
              <TextField
                label="Titre / accroche"
                value={accountDraft.headline}
                onChange={(event) => setAccountDraft((previous) => ({ ...previous, headline: event.target.value }))}
                fullWidth
              />
              <TextField
                label="Bio"
                value={accountDraft.bio}
                onChange={(event) => setAccountDraft((previous) => ({ ...previous, bio: event.target.value }))}
                fullWidth
                multiline
                minRows={3}
              />
            </Stack>

            <Divider sx={{ my: 3 }} />

            {entityType && (
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Stack spacing={0.5}>
                  <Typography variant="overline" sx={{ color: '#7b8794', letterSpacing: 2, fontWeight: 900 }}>
                    Profil public lié
                  </Typography>
                  <Typography sx={{ fontWeight: 800 }}>
                    {entityType === 'student' ? 'Étudiant' : entityType === 'school' ? 'École' : 'Entreprise'}
                  </Typography>
                </Stack>

                {entityType !== 'student' && (
                  <FormControl fullWidth>
                    <InputLabel>Choisir le profil</InputLabel>
                    <Select
                      label="Choisir le profil"
                      value={selectedEntityId}
                      onChange={(event) => setSelectedEntityId(event.target.value)}
                    >
                      {selectedCollection.map((item) => (
                        <MenuItem key={item.id} value={String(item.id)}>
                          {item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {entityType === 'student' && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                    <TextField label="Prénom" value={entityDraft.firstName || ''} onChange={(event) => handleEntityFieldChange('firstName', event.target.value)} />
                    <TextField label="Nom" value={entityDraft.lastName || ''} onChange={(event) => handleEntityFieldChange('lastName', event.target.value)} />
                    <TextField label="Âge" type="number" value={entityDraft.age || ''} onChange={(event) => handleEntityFieldChange('age', event.target.value)} />
                    <TextField label="Poste recherché" value={entityDraft.jobTitle || ''} onChange={(event) => handleEntityFieldChange('jobTitle', event.target.value)} />
                    <TextField label="Localisation" value={entityDraft.location || ''} onChange={(event) => handleEntityFieldChange('location', event.target.value)} />
                    <Box>
                      <Typography sx={{ fontSize: 12, color: '#627386', mb: 0.5 }}>École actuelle</Typography>
                      <TextField value={
                        (schools.find(s => String(s.id) === String(entityDraft.schoolId)) || {}).name || 'Aucune école'
                      } disabled fullWidth />
                    </Box>
                    <FormControl>
                      <InputLabel>Demander une école (nouvelle)</InputLabel>
                      <Select
                        label="Demander une école (nouvelle)"
                        value={entityDraft.pendingSchoolId || ''}
                        onChange={(event) => handleEntityFieldChange('pendingSchoolId', event.target.value)}
                      >
                        <MenuItem value="">Aucune</MenuItem>
                        {schools.map((school) => (
                          <MenuItem key={school.id} value={String(school.id)}>
                            {school.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {entityDraft.pendingSchoolId && (
                        <Typography variant="caption" sx={{ color: '#8a6d2f', mt: 0.5 }}>
                          Demande envoyée — en attente de validation par l'école.
                        </Typography>
                      )}
                    </FormControl>
                    <FormControl>
                      <InputLabel>Entreprise</InputLabel>
                      <Select label="Entreprise" value={entityDraft.companyId || ''} onChange={(event) => handleEntityFieldChange('companyId', event.target.value)}>
                        <MenuItem value="">Aucune entreprise</MenuItem>
                        {companies.map((company) => (
                          <MenuItem key={company.id} value={String(company.id)}>
                            {company.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <InputLabel>Demander une entreprise (nouvelle)</InputLabel>
                      <Select
                        label="Demander une entreprise (nouvelle)"
                        value={entityDraft.pendingCompanyId || ''}
                        onChange={(event) => handleEntityFieldChange('pendingCompanyId', event.target.value)}
                      >
                        <MenuItem value="">Aucune</MenuItem>
                        {companies.map((company) => (
                          <MenuItem key={company.id} value={String(company.id)}>
                            {company.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {entityDraft.pendingCompanyId && (
                        <Typography variant="caption" sx={{ color: '#8a6d2f', mt: 0.5 }}>
                          Demande envoyée — en attente de validation par l'entreprise.
                        </Typography>
                      )}
                    </FormControl>
                    <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                      <TagChipsInput
                        label="Compétences et tags"
                        tags={entityDraft.skillsTags || []}
                        onChange={(nextTags) => handleEntityFieldChange('skillsTags', nextTags)}
                        helperText="Tape un tag puis Entrée. Supprime avec la croix au survol."
                        placeholder="HTML, CSS, React"
                      />
                    </Box>
                  </Box>
                )}

                {(entityType === 'school' || entityType === 'company') && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                    <TextField label="Nom" value={entityDraft.name || ''} onChange={(event) => handleEntityFieldChange('name', event.target.value)} />
                    <TextField label="Localisation" value={entityDraft.location || ''} onChange={(event) => handleEntityFieldChange('location', event.target.value)} />
                    <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                      <TagChipsInput
                        label={entityType === 'school' ? 'Spécialités' : 'Compétences / expertises'}
                        tags={entityDraft.specialtiesTags || []}
                        onChange={(nextTags) => handleEntityFieldChange('specialtiesTags', nextTags)}
                        helperText="Tape un tag puis Entrée. Supprime avec la croix au survol."
                        placeholder="React, UI / UX, Cloud"
                      />
                    </Box>
                  </Box>
                )}
                {/* Pending requests for schools/companies */}
                {(entityType === 'school' || entityType === 'company') && selectedEntity && (
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Typography variant="overline" sx={{ color: '#7b8794', letterSpacing: 2, fontWeight: 900 }}>
                      Demandes en attente
                    </Typography>
                    {pendingRequests.length === 0 ? (
                      <Typography variant="body2" sx={{ color: '#607287', mt: 1 }}>
                        Aucune demande en attente pour le moment.
                      </Typography>
                    ) : (
                      pendingRequests.map((s) => (
                        <Paper key={s.id} sx={{ p: 1.5, mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography sx={{ fontWeight: 800 }}>{s.firstName} {s.lastName}</Typography>
                            <Typography variant="body2" sx={{ color: '#607287' }}>{(s.skills || []).map(k => k.name || k).join(', ')}</Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <Button size="small" variant="contained" color="success" disabled={saving} onClick={() => handleRespondPending(s.id, 'approve')}>Approuver</Button>
                            <Button size="small" variant="outlined" color="error" disabled={saving} onClick={() => handleRespondPending(s.id, 'reject')}>Refuser</Button>
                          </Stack>
                        </Paper>
                      ))
                    )}
                  </Box>
                )}
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' } }}>
              <Box>
                <Typography variant="overline" sx={{ color: '#7b8794', letterSpacing: 2, fontWeight: 900 }}>
                  Tags partagés
                </Typography>
                <Typography variant="body2" sx={{ color: '#607287' }}>
                  Clique sur un tag pour le réutiliser dans ton profil public.
                </Typography>
              </Box>
              {loading && <Typography variant="body2" sx={{ color: '#607287' }}>Chargement des suggestions...</Typography>}
            </Stack>

            <Stack direction="row" gap={0.8} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
              {sharedTags.length ? sharedTags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onClick={() => addSharedTag(tag)}
                  clickable
                  sx={{ bgcolor: '#eef4fb', fontWeight: 800 }}
                />
              )) : (
                <Typography variant="body2" sx={{ color: '#607287' }}>
                  Aucun tag partagé disponible pour le moment.
                </Typography>
              )}
            </Stack>

            <Stack direction="row" spacing={1.2} sx={{ mt: 3 }}>
              <Button type="submit" variant="contained" disabled={saving} sx={{ textTransform: 'none', fontWeight: 900 }}>
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}