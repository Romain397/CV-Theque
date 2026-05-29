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
    if (!entityType || !selectedCollection.length) return;

    const bindingKey = entityType === 'student' ? 'studentId' : entityType === 'school' ? 'schoolId' : 'companyId';
    const persistedId = user?.profile?.[bindingKey];
    const fallbackId = selectedCollection[0]?.id;

    setSelectedEntityId(String(persistedId || fallbackId || ''));
  }, [entityType, selectedCollection, user]);

  useEffect(() => {
    if (!selectedEntity) {
      setEntityDraft({});
      return;
    }

    if (entityType === 'student') {
      setEntityDraft({
        firstName: selectedEntity.firstName || '',
        lastName: selectedEntity.lastName || '',
        age: selectedEntity.age ?? '',
        jobTitle: selectedEntity.jobTitle || '',
        location: selectedEntity.location || '',
        schoolId: selectedEntity.school?.id || '',
        companyId: selectedEntity.company?.id || '',
        skillsTags: tagsToList(selectedEntity.skills),
      });
      return;
    }

    if (entityType === 'school' || entityType === 'company') {
      setEntityDraft({
        name: selectedEntity.name || '',
        location: selectedEntity.location || '',
        specialtiesTags: tagsToList(selectedEntity.specialties),
      });
    }
  }, [entityType, selectedEntity]);

  const bindingKey = entityType === 'student' ? 'studentId' : entityType === 'school' ? 'schoolId' : entityType === 'company' ? 'companyId' : null;

  const handleEntityFieldChange = (name, value) => {
    setEntityDraft((previous) => ({
      ...previous,
      [name]: value,
    }));
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
        updatedEntity = await studentsService.updateStudent(selectedEntityId, {
          firstName: entityDraft.firstName || '',
          lastName: entityDraft.lastName || '',
          age: Number(entityDraft.age || 0),
          jobTitle: entityDraft.jobTitle || '',
          location: entityDraft.location || '',
          schoolId: entityDraft.schoolId || '',
          companyId: entityDraft.companyId || '',
          skills: skillsToPayload(entityDraft.skillsTags || []),
        });

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

      updateUserRecord(user.id, (record) => ({
        ...record,
        name: nextAccountName,
        profile: {
          ...(record.profile || {}),
          displayName: accountDraft.displayName || nextAccountName,
          headline: accountDraft.headline || '',
          bio: accountDraft.bio || '',
          [bindingKey]: String(selectedEntityId),
        },
      }));

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

                {entityType === 'student' && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                    <TextField label="Prénom" value={entityDraft.firstName || ''} onChange={(event) => handleEntityFieldChange('firstName', event.target.value)} />
                    <TextField label="Nom" value={entityDraft.lastName || ''} onChange={(event) => handleEntityFieldChange('lastName', event.target.value)} />
                    <TextField label="Âge" type="number" value={entityDraft.age || ''} onChange={(event) => handleEntityFieldChange('age', event.target.value)} />
                    <TextField label="Poste recherché" value={entityDraft.jobTitle || ''} onChange={(event) => handleEntityFieldChange('jobTitle', event.target.value)} />
                    <TextField label="Localisation" value={entityDraft.location || ''} onChange={(event) => handleEntityFieldChange('location', event.target.value)} />
                    <FormControl>
                      <InputLabel>École</InputLabel>
                      <Select label="École" value={entityDraft.schoolId || ''} onChange={(event) => handleEntityFieldChange('schoolId', event.target.value)}>
                        <MenuItem value="">Aucune école</MenuItem>
                        {schools.map((school) => (
                          <MenuItem key={school.id} value={String(school.id)}>
                            {school.name}
                          </MenuItem>
                        ))}
                      </Select>
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