import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
import SmartSummaryBox from '../components/SmartSummaryBox';
import * as studentsService from '../services/studentsService';
import * as schoolsService from '../services/schoolsService';
import * as companiesService from '../services/companiesService';
import * as jobsService from '../services/jobsService';
import { getCompanyProfile, getSchoolProfile } from '../data/entityProfiles';

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

const skillLevelOptions = ['Débutant', 'Intermédiaire', 'Avancé', 'Expert'];

const normalizeSkillEntries = (skills = []) =>
  (Array.isArray(skills) ? skills : [])
    .map((skill) => {
      if (typeof skill === 'string') {
        const name = skill.trim();
        return name ? { name, level: 'Intermédiaire' } : null;
      }

      if (!skill || typeof skill !== 'object') return null;

      const name = `${skill.name || ''}`.trim();
      const level = skillLevelOptions.includes(skill.level) ? skill.level : 'Intermédiaire';

      return name ? { name, level } : null;
    })
    .filter(Boolean);

const skillsToPayload = (skills = []) =>
  normalizeSkillEntries(skills).map((skill) => ({
    name: skill.name,
    level: skill.level || 'Intermédiaire',
  }));

const getAuthToken = () => {
  const direct = localStorage.getItem('cv_token');
  if (direct) return direct;
  try {
    const auth = JSON.parse(localStorage.getItem('cv_auth') || 'null');
    return auth?.token || null;
  } catch {
    return null;
  }
};

const normalizeProjects = (projects = []) =>
  (Array.isArray(projects) ? projects : [])
    .map((project) => {
      if (typeof project === 'string') {
        const name = project.trim();
        return name ? { name, description: '', link: '' } : null;
      }

      if (!project || typeof project !== 'object') return null;

      const name = `${project.name || project.title || ''}`.trim();
      const description = `${project.description || ''}`.trim();
      const link = `${project.link || project.url || ''}`.trim();

      if (!name && !description && !link) return null;

      return {
        name: name || (description ? description.slice(0, 48) : 'Projet'),
        description,
        link,
      };
    })
    .filter(Boolean);

export default function Profile() {
  const { user, token, logout, updateUserRecord, refreshUser } = useAuth();
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [accountDraft, setAccountDraft] = useState({ firstName: '', lastName: '', headline: '', bio: '' });
  const [entityDraft, setEntityDraft] = useState({});
  const [skillInput, setSkillInput] = useState('');
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

  const selectedSchool = useMemo(
    () => schools.find((school) => String(school.id) === String(entityDraft.schoolId || entityDraft.pendingSchoolId || '')) || null,
    [entityDraft.pendingSchoolId, entityDraft.schoolId, schools]
  );

  const selectedCompany = useMemo(
    () => companies.find((company) => String(company.id) === String(entityDraft.companyId || entityDraft.pendingCompanyId || '')) || null,
    [companies, entityDraft.companyId, entityDraft.pendingCompanyId]
  );

  const visibleSchoolId = entityDraft.pendingSchoolId || entityDraft.schoolId || '';
  const visibleCompanyId = entityDraft.pendingCompanyId || entityDraft.companyId || '';

  const publicProfileTemplate = useMemo(() => {
    if (entityType === 'school') return getSchoolProfile(selectedEntity);
    if (entityType === 'company') return getCompanyProfile(selectedEntity);
    return null;
  }, [entityType, selectedEntity]);

  const accountFullName = useMemo(() => {
    const draftName = `${accountDraft.firstName || ''} ${accountDraft.lastName || ''}`.trim();
    if (draftName) return draftName;

    const profileName = `${user?.profile?.firstName || ''} ${user?.profile?.lastName || ''}`.trim();
    if (profileName) return profileName;

    return user?.name || '';
  }, [accountDraft.firstName, accountDraft.lastName, user?.name, user?.profile?.firstName, user?.profile?.lastName]);

  const sharedTags = useMemo(() => {
    const pool = [
      ...students.flatMap((student) => (student.skills || []).map((skill) => skill?.name).filter(Boolean)),
      ...schools.flatMap((school) => school.specialties || []),
      ...companies.flatMap((company) => company.specialties || []),
      ...jobs.flatMap((job) => job.tags || []),
    ];

    return Array.from(new Set(pool)).slice(0, 12);
  }, [companies, jobs, schools, students]);

  const smartSummaryProfile = useMemo(() => {
    if (!user || !entityType) return null;

    if (entityType === 'student') {
      return {
        type: 'student',
        firstName: accountDraft.firstName || user.profile?.firstName || '',
        lastName: accountDraft.lastName || user.profile?.lastName || '',
        headline: accountDraft.headline || '',
        bio: accountDraft.bio || '',
        age: entityDraft.age || '',
        jobTitle: entityDraft.jobTitle || '',
        location: entityDraft.location || '',
        skills: entityDraft.skills || [],
        tags: entityDraft.tags || [],
        projects: normalizeProjects(entityDraft.projects || []),
        schoolName: selectedSchool?.name || '',
        companyName: selectedCompany?.name || '',
      };
    }

    return {
      type: entityType,
      name: entityDraft.name || selectedEntity?.name || '',
      location: (entityDraft.locationsTags || []).join(', ') || entityDraft.location || selectedEntity?.location || '',
      locations: entityDraft.locationsTags || selectedEntity?.locations || [],
      headline: accountDraft.headline || '',
      bio: accountDraft.bio || '',
      specialties: entityDraft.specialtiesTags || [],
      summary: publicProfileTemplate?.summary || '',
      highlights: publicProfileTemplate?.highlights || [],
      website: publicProfileTemplate?.website || '',
    };
  }, [
    accountDraft.bio,
    accountDraft.firstName,
    accountDraft.lastName,
    accountDraft.headline,
    companies,
    entityDraft.age,
    entityDraft.companyId,
    entityDraft.firstName,
    entityDraft.jobTitle,
    entityDraft.lastName,
    entityDraft.location,
    entityDraft.locationsTags,
    entityDraft.name,
    entityDraft.projects,
    entityDraft.skills,
    entityDraft.specialtiesTags,
    entityDraft.schoolId,
    entityType,
    selectedCompany?.name,
    selectedEntity?.location,
    selectedEntity?.name,
    selectedSchool?.name,
    publicProfileTemplate,
    user,
  ]);

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
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || '',
      headline: user.profile?.headline || '',
      bio: user.profile?.bio || '',
    });
  }, [user]);

  useEffect(() => {
    if (!entityType) return;

    // For students, the account IS the public profile: bind to current user id
    if (entityType === 'student' || entityType === 'school' || entityType === 'company') {
      setSelectedEntityId(String(user.id));
      return;
    }

    setSelectedEntityId(String(user.id));
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
        companyId: p.companyId || p.pendingCompanyId || '',
        skills: normalizeSkillEntries(p.skills || []),
        tags: tagsToList(p.tags || []),
        projects: normalizeProjects(p.projects || []),
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
        locationsTags: tagsToList(selectedEntity.locations?.length ? selectedEntity.locations : [selectedEntity.location]),
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
        tags: Array.from(new Set([...(previous.tags || []), tag])),
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

  const addSkill = () => {
    if (entityType !== 'student') return;
    const name = skillInput.trim();
    if (!name) return;

    setEntityDraft((previous) => ({
      ...previous,
      skills: Array.from(
        new Map(
          [...normalizeSkillEntries(previous.skills || []), { name, level: 'Intermédiaire' }]
            .filter((skill) => skill?.name)
            .map((skill) => [skill.name.toLowerCase(), skill])
        ).values()
      ),
    }));
    setSkillInput('');
  };

  const addProject = () => {
    if (entityType !== 'student') return;
    setEntityDraft((previous) => ({
      ...previous,
      projects: [
        ...(previous.projects || []),
        { name: 'Nouveau projet', description: '', link: '' },
      ],
    }));
  };

  const updateProject = (index, field, value) => {
    if (entityType !== 'student') return;
    setEntityDraft((previous) => {
      const projects = normalizeProjects(previous.projects || []);
      const nextProjects = [...projects];
      nextProjects[index] = {
        ...nextProjects[index],
        [field]: value,
      };
      return {
        ...previous,
        projects: nextProjects,
      };
    });
  };

  const removeProject = (index) => {
    if (entityType !== 'student') return;
    setEntityDraft((previous) => ({
      ...previous,
      projects: normalizeProjects(previous.projects || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!user) return;
    if (!entityType) {
      setMessage({ type: 'error', text: 'Aucun profil public disponible pour ce compte.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      let updatedEntity = null;
      let nextAccountName = `${accountDraft.firstName || ''} ${accountDraft.lastName || ''}`.trim() || user.name;

      if (entityType === 'student') {
        // update the user's own profile directly
        const targetId = String(user.id);
        const payload = {
          firstName: accountDraft.firstName || '',
          lastName: accountDraft.lastName || '',
          headline: accountDraft.headline || '',
          bio: accountDraft.bio || '',
          age: Number(entityDraft.age || 0),
          jobTitle: entityDraft.jobTitle || '',
          location: entityDraft.location || '',
          schoolId: user.profile?.schoolId || '',
          companyId: user.profile?.companyId || '',
          skills: skillsToPayload(entityDraft.skills || []),
          tags: tagsToList(entityDraft.tags || []),
          projects: normalizeProjects(entityDraft.projects || []),
        };
        const selectedSchoolId = String(entityDraft.pendingSchoolId || '').trim() || String(entityDraft.schoolId || '').trim();
        const approvedSchoolId = String(user.profile?.schoolId || '').trim();
        const requestedSchoolId = selectedSchoolId && selectedSchoolId !== approvedSchoolId ? selectedSchoolId : '';
        const selectedCompanyId = String(entityDraft.companyId || '').trim();
        const approvedCompanyId = String(user.profile?.companyId || '').trim();
        const requestedCompanyId = String(entityDraft.pendingCompanyId || '').trim() || (
          selectedCompanyId && selectedCompanyId !== approvedCompanyId ? selectedCompanyId : ''
        );
        // updateStudent wraps this payload in { profile: ... }, so pending fields must stay
        // at the same level as the editable profile fields.
        if (requestedSchoolId || requestedCompanyId) {
          if (requestedSchoolId) {
            payload.pendingSchoolId = requestedSchoolId;
            payload.pendingSchoolStatus = 'pending';
          }

          if (requestedCompanyId) {
            payload.pendingCompanyId = requestedCompanyId;
            payload.pendingCompanyStatus = 'pending';
          }
        }
        const authToken = token || getAuthToken();
        if (!authToken) {
          throw new Error('Jeton d’authentification introuvable. Reconnecte-toi puis réessaie.');
        }
        updatedEntity = await studentsService.updateStudent(targetId, payload, authToken);

        const updatedProfile = updatedEntity?.profile || {};
        nextAccountName = `${updatedProfile.firstName || ''} ${updatedProfile.lastName || ''}`.trim() || nextAccountName;
      }

      if (entityType === 'school') {
        const targetId = String(user.id);
        updatedEntity = await schoolsService.updateSchool(targetId, {
          name: entityDraft.name || '',
          location: (entityDraft.locationsTags || [])[0] || entityDraft.location || '',
          locations: tagsToList(entityDraft.locationsTags || []),
          specialties: entityDraft.specialtiesTags || [],
          firstName: accountDraft.firstName || '',
          lastName: accountDraft.lastName || '',
          headline: accountDraft.headline || '',
          bio: accountDraft.bio || '',
        });

        nextAccountName = updatedEntity.name || nextAccountName;
      }

      if (entityType === 'company') {
        const targetId = String(user.id);
        updatedEntity = await companiesService.updateCompany(targetId, {
          name: entityDraft.name || '',
          location: (entityDraft.locationsTags || [])[0] || entityDraft.location || '',
          locations: tagsToList(entityDraft.locationsTags || []),
          specialties: entityDraft.specialtiesTags || [],
          firstName: accountDraft.firstName || '',
          lastName: accountDraft.lastName || '',
          headline: accountDraft.headline || '',
          bio: accountDraft.bio || '',
        });

        nextAccountName = updatedEntity.name || nextAccountName;
      }

      updateUserRecord(user.id, (record) => {
        const baseProfile = {
          ...(record.profile || {}),
          firstName: accountDraft.firstName || record.profile?.firstName || '',
          lastName: accountDraft.lastName || record.profile?.lastName || '',
          headline: accountDraft.headline || '',
          bio: accountDraft.bio || '',
        };

        // If student, merge updatedEntity fields into profile
        let mergedProfile = baseProfile;

        if (updatedEntity) {
          mergedProfile = {
            ...baseProfile,
            firstName: updatedEntity.profile?.firstName || baseProfile.firstName || '',
            lastName: updatedEntity.profile?.lastName || baseProfile.lastName || '',
            headline: updatedEntity.profile?.headline || baseProfile.headline || '',
            bio: updatedEntity.profile?.bio || baseProfile.bio || '',
            age: updatedEntity.profile?.age ?? baseProfile.age ?? 0,
            jobTitle: updatedEntity.profile?.jobTitle || baseProfile.jobTitle || '',
            location: updatedEntity.profile?.location || baseProfile.location || '',
            skills: updatedEntity.profile?.skills || baseProfile.skills || [],
            tags: updatedEntity.profile?.tags || baseProfile.tags || [],
            projects: updatedEntity.profile?.projects || baseProfile.projects || [],
            schoolId: updatedEntity.profile?.schoolId || baseProfile.schoolId || '',
            companyId: updatedEntity.profile?.companyId || baseProfile.companyId || '',
          };
        }

        // reflect pending fields if present (school + company)
        if (entityType === 'student' && updatedEntity && updatedEntity.profile && mergedProfile) {
          mergedProfile.pendingSchoolId = updatedEntity.profile.pendingSchoolId || baseProfile.pendingSchoolId || null;
          mergedProfile.pendingSchoolStatus = updatedEntity.profile.pendingSchoolStatus || baseProfile.pendingSchoolStatus || null;
          mergedProfile.pendingCompanyId = updatedEntity.profile.pendingCompanyId || baseProfile.pendingCompanyId || null;
          mergedProfile.pendingCompanyStatus = updatedEntity.profile.pendingCompanyStatus || baseProfile.pendingCompanyStatus || null;
        }

        if ((entityType === 'school' || entityType === 'company') && updatedEntity && updatedEntity.profile) {
          mergedProfile.location = updatedEntity.profile.location || baseProfile.location || '';
          mergedProfile.locations = updatedEntity.profile.locations || baseProfile.locations || [];
          mergedProfile.skills = updatedEntity.profile.skills || baseProfile.skills || [];
        }

        if ((entityType === 'school' || entityType === 'company') && updatedEntity && !updatedEntity.profile) {
          mergedProfile.location = updatedEntity.location || baseProfile.location || '';
          mergedProfile.locations = updatedEntity.locations || baseProfile.locations || [];
          mergedProfile.skills = updatedEntity.specialties || baseProfile.skills || [];
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
    <Container sx={{ py: 4, minHeight: '100vh', bgcolor: 'var(--page-bg)', color: 'var(--text-primary)' }}>
      <Box sx={{ display: 'grid', gap: 2.4 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 4,
            bgcolor: 'var(--accent-strong)',
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
                {accountFullName}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,.8)', mt: 0.5 }}>
                {roleLabel(user.role)} - {user.email}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,.8)', mt: 0.3 }}>
                Mail: {user.email}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip label={user.approved ? 'Compte validé' : 'En attente'} sx={{ bgcolor: 'background.paper', fontWeight: 900 }} />
              <Button variant="outlined" onClick={logout} sx={{ borderColor: 'rgba(255,255,255,.45)', color: '#fff', textTransform: 'none' }}>
                Se déconnecter
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {message && <Alert severity={message.type}>{message.text}</Alert>}

        <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Typography variant="overline" sx={{ color: 'var(--text-secondary)', letterSpacing: 2, fontWeight: 900 }}>
            Profil privé
          </Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 900, mt: 0.5 }}>Ce que les autres voient sur ta fiche</Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>
            Les compétences et les tags sont gérés séparément pour garder un profil plus lisible.
          </Typography>

          <Box component="form" onSubmit={handleSave} sx={{ mt: 2.5 }}>
            <Stack spacing={2}>
              {entityType !== 'school' && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Prénom"
                    value={accountDraft.firstName}
                    onChange={(event) => setAccountDraft((previous) => ({ ...previous, firstName: event.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Nom"
                    value={accountDraft.lastName}
                    onChange={(event) => setAccountDraft((previous) => ({ ...previous, lastName: event.target.value }))}
                    fullWidth
                  />
                </Box>
              )}
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
                      <Typography variant="overline" sx={{ color: 'var(--text-secondary)', letterSpacing: 2, fontWeight: 900 }}>
                        {entityType === 'student' ? 'Mon profil étudiant' : entityType === 'school' ? 'Mon profil école' : 'Mon profil entreprise'}
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>
                        {entityType === 'student' ? 'Étudiant' : entityType === 'school' ? 'École' : 'Entreprise'}
                      </Typography>
                    </Stack>

                {entityType === 'company' && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'var(--surface-soft)',
                    }}
                  >
                    <Typography variant="overline" sx={{ color: 'var(--text-secondary)', letterSpacing: 2, fontWeight: 900 }}>
                      Mon profil entreprise
                    </Typography>
                    <Typography sx={{ fontWeight: 800, mt: 0.4 }}>
                      {selectedEntity?.name || user?.name || 'Entreprise'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>
                      Tu es déjà sur ton profil entreprise. Les demandes de validation sont disponibles dans une page dédiée.
                    </Typography>
                    <Button
                      component={RouterLink}
                      to="/company-requests"
                      variant="outlined"
                      sx={{ mt: 1.5, textTransform: 'none', fontWeight: 800 }}
                    >
                      Voir les élèves en attente
                    </Button>
                  </Box>
                )}

                {entityType === 'student' && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                    <TextField label="Âge" type="number" value={entityDraft.age || ''} onChange={(event) => handleEntityFieldChange('age', event.target.value)} />
                    <TextField label="Poste recherché" value={entityDraft.jobTitle || ''} onChange={(event) => handleEntityFieldChange('jobTitle', event.target.value)} />
                    <TextField label="Localisation" value={entityDraft.location || ''} onChange={(event) => handleEntityFieldChange('location', event.target.value)} />
                    <FormControl>
                      <InputLabel>École</InputLabel>
                      <Select
                        label="École"
                        value={visibleSchoolId}
                        onChange={(event) => handleEntityFieldChange('pendingSchoolId', event.target.value)}
                      >
                        <MenuItem value="">Aucune</MenuItem>
                        {schools.map((school) => (
                          <MenuItem key={school.id} value={String(school.id)}>
                            {school.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {visibleSchoolId && (
                        <Typography variant="caption" sx={{ color: 'var(--warning, #8a5a00)', mt: 0.5 }}>
                          {(entityDraft.schoolId && visibleSchoolId === entityDraft.schoolId)
                            ? 'École affichée sur ton profil.'
                            : 'Demande envoyée — en attente de validation par l’école.'}
                        </Typography>
                      )}
                    </FormControl>
                    <FormControl>
                      <InputLabel>Entreprise</InputLabel>
                      <Select
                        label="Entreprise"
                        value={visibleCompanyId}
                        onChange={(event) => handleEntityFieldChange('pendingCompanyId', event.target.value)}
                      >
                        <MenuItem value="">Aucune entreprise</MenuItem>
                        {companies.map((company) => (
                          <MenuItem key={company.id} value={String(company.id)}>
                            {company.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {visibleCompanyId && (
                        <Typography variant="caption" sx={{ color: 'var(--warning, #8a5a00)', mt: 0.5 }}>
                          {(entityDraft.companyId && visibleCompanyId === entityDraft.companyId)
                            ? 'Entreprise affichée sur ton profil.'
                            : 'Demande envoyée — en attente de validation par l’entreprise.'}
                        </Typography>
                      )}
                    </FormControl>
                    <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                      <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)', mb: 0.75 }}>
                        Compétences et niveaux
                      </Typography>
                      {(entityDraft.skills || []).length ? (
                        <Stack spacing={1}>
                          {(entityDraft.skills || []).map((skill, index) => (
                            <Paper
                              key={`${skill.name}-${index}`}
                              elevation={0}
                              sx={{
                                p: 1.25,
                                borderRadius: 1.5,
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'var(--surface-soft)',
                              }}
                            >
                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
                                <Typography sx={{ fontWeight: 800, flex: 1 }}>{skill.name}</Typography>
                                <FormControl size="small" sx={{ minWidth: 180 }}>
                                  <InputLabel>Niveau</InputLabel>
                                  <Select
                                    label="Niveau"
                                    value={skill.level || 'Intermédiaire'}
                                    onChange={(event) => {
                                      const nextLevel = event.target.value;
                                      setEntityDraft((previous) => {
                                        const nextSkills = normalizeSkillEntries(previous.skills || []);
                                        nextSkills[index] = {
                                          ...nextSkills[index],
                                          level: nextLevel,
                                        };
                                        return {
                                          ...previous,
                                          skills: nextSkills,
                                        };
                                      });
                                    }}
                                  >
                                    {skillLevelOptions.map((levelOption) => (
                                      <MenuItem key={levelOption} value={levelOption}>
                                        {levelOption}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Stack>
                            </Paper>
                          ))}
                          </Stack>
                      ) : (
                        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 1.5, border: '1px dashed', borderColor: 'divider', bgcolor: 'var(--surface-soft)' }}>
                          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                            Ajoute d’abord une compétence pour lui attribuer un niveau.
                          </Typography>
                        </Paper>
                      )}
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.2 }}>
                        <TextField
                          label="Ajouter une compétence"
                          value={skillInput}
                          onChange={(event) => setSkillInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              addSkill();
                            }
                          }}
                          fullWidth
                          size="small"
                        />
                        <Button
                          variant="outlined"
                          onClick={addSkill}
                          sx={{ textTransform: 'none', fontWeight: 800, whiteSpace: 'nowrap' }}
                        >
                          Ajouter
                        </Button>
                      </Stack>
                    </Box>
                    <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                      <TagChipsInput
                        label="Tags"
                        tags={entityDraft.tags || []}
                        onChange={(nextTags) => handleEntityFieldChange('tags', nextTags)}
                        helperText="Ajoute des tags libres sans modifier les compétences."
                        placeholder="Portfolio, Design System, Mobile"
                      />
                    </Box>
                    <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box>
                          <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)', mb: 0.2 }}>Projets</Typography>
                          <Typography sx={{ fontWeight: 800 }}>Ajouter les projets visibles sur ton profil</Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          onClick={addProject}
                          sx={{ textTransform: 'none', fontWeight: 800 }}
                        >
                          Ajouter un projet
                        </Button>
                      </Stack>

                      <Stack spacing={1.4}>
                        {normalizeProjects(entityDraft.projects || []).length === 0 ? (
                          <Paper elevation={0} sx={{ p: 1.5, borderRadius: 1.5, border: '1px dashed', borderColor: 'divider', bgcolor: 'var(--surface-soft)' }}>
                            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                              Aucun projet renseigné pour le moment.
                            </Typography>
                          </Paper>
                        ) : (
                          normalizeProjects(entityDraft.projects || []).map((project, index) => (
                            <Paper
                              key={`${project.name || project.description || index}`}
                              elevation={0}
                              sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
                            >
                              <Stack spacing={1}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                                  <Box sx={{ flex: 1 }}>
                                    <TextField
                                      label="Nom du projet"
                                      value={project.name || ''}
                                      onChange={(event) => updateProject(index, 'name', event.target.value)}
                                      fullWidth
                                      size="small"
                                    />
                                  </Box>
                                  <Button
                                    color="error"
                                    variant="text"
                                    onClick={() => removeProject(index)}
                                    sx={{ minWidth: 'auto', textTransform: 'none', fontWeight: 800 }}
                                  >
                                    Retirer
                                  </Button>
                                </Stack>
                                <TextField
                                  label="Description"
                                  value={project.description || ''}
                                  onChange={(event) => updateProject(index, 'description', event.target.value)}
                                  fullWidth
                                  size="small"
                                  multiline
                                  minRows={2}
                                />
                                <TextField
                                  label="Lien du projet"
                                  value={project.link || ''}
                                  onChange={(event) => updateProject(index, 'link', event.target.value)}
                                  fullWidth
                                  size="small"
                                />
                              </Stack>
                            </Paper>
                          ))
                        )}
                      </Stack>
                    </Box>
                    <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                      <SmartSummaryBox
                        type="student"
                        profile={smartSummaryProfile}
                        title="Résumé intelligent du profil"
                        description="Transforme ton profil en version courte pour les cartes et aperçus."
                      />
                    </Box>
                  </Box>
                )}

                {(entityType === 'school' || entityType === 'company') && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                    <TextField label="Nom" value={entityDraft.name || ''} onChange={(event) => handleEntityFieldChange('name', event.target.value)} />
                    <Box>
                      <TagChipsInput
                        label="Localisations"
                        tags={entityDraft.locationsTags || []}
                        onChange={(nextLocations) => handleEntityFieldChange('locationsTags', nextLocations)}
                        helperText="Tape une ville ou adresse puis Entrée. La première localisation sera utilisée comme localisation principale."
                        placeholder="Versailles, Paris, Lyon"
                      />
                    </Box>
                    <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                      <TagChipsInput
                        label={entityType === 'school' ? 'Spécialités' : 'Compétences / expertises'}
                        tags={entityDraft.specialtiesTags || []}
                        onChange={(nextTags) => handleEntityFieldChange('specialtiesTags', nextTags)}
                        helperText="Tape un tag puis Entrée. Supprime avec la croix au survol."
                        placeholder="React, UI / UX, Cloud"
                      />
                    </Box>
                    <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                      <SmartSummaryBox
                        type={entityType}
                        profile={smartSummaryProfile}
                        title="Résumé intelligent du profil"
                        description="Transforme la fiche en résumé court, homogène et lisible."
                      />
                    </Box>
                  </Box>
                )}
                {entityType === 'school' && (
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'var(--surface-soft)' }}>
                    <Typography variant="overline" sx={{ color: 'var(--text-secondary)', letterSpacing: 2, fontWeight: 900 }}>
                      Demandes école
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>
                      Les demandes des élèves sont disponibles dans un dashboard dédié.
                    </Typography>
                    <Button
                      component={RouterLink}
                      to="/school-requests"
                      variant="outlined"
                      sx={{ mt: 1.5, textTransform: 'none', fontWeight: 800 }}
                    >
                      Voir les élèves en attente
                    </Button>
                  </Paper>
                )}
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' } }}>
              <Box>
                <Typography variant="overline" sx={{ color: 'var(--text-secondary)', letterSpacing: 2, fontWeight: 900 }}>
                  Tags partagés
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                  Clique sur un tag pour le réutiliser dans ton profil public.
                </Typography>
              </Box>
              {loading && <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>Chargement des suggestions...</Typography>}
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
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
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
