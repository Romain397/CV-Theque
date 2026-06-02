import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { Link as RouterLink } from 'react-router-dom';
import { useStudents } from '../hooks/useStudents';
import { StudentCard } from './StudentCard';
import { LoadingIndicator } from './LoadingIndicator';
import { ErrorAlert } from './ErrorAlert';
import SmartSummaryBox from './SmartSummaryBox';
import { useThemeMode } from '../theme';

const getInitials = (student) =>
  `${student?.firstName?.[0] || ''}${student?.lastName?.[0] || ''}`.toUpperCase() || 'LB';

const heroCards = [
  ['Profils valorisés', 'Des pages lisibles pour présenter parcours, compétences et projets.'],
  ['Mise en relation', 'Une recherche rapide pour aider les entreprises à trouver les bons talents.'],
  ['Base évolutive', "Une interface claire, prête pour l'intégration avec l'API et les logos."],
];

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

const normalizeTagList = (tags = []) =>
  Array.from(
    new Set(
      (Array.isArray(tags) ? tags : [])
        .map((tag) => (typeof tag === 'string' ? tag : tag?.name))
        .filter(Boolean)
    )
  );

const isKnownName = (name) => {
  const normalized = `${name || ''}`.trim().toLowerCase();
  return Boolean(normalized) && normalized !== 'inconnue';
};

export const StudentsList = () => {
  const {
    students,
    loading,
    error,
    refresh,
    addStudent,
    updateStudentItem,
    removeStudent,
  } = useStudents();
  const { mode, toggleMode } = useThemeMode();

  const [formOpen, setFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [formStudent, setFormStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [skill, setSkill] = useState('');
  const [sort, setSort] = useState('featured');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const profileDetailRef = useRef(null);
  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const results = students.filter((student) => {
      const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase();
      const skillNames = (student.skills || []).map((item) => item?.name).filter(Boolean).join(' ');
      const tagNames = normalizeTagList(student.tags).join(' ');
      const projectNames = normalizeProjects(student.projects).map((project) => `${project.name} ${project.description}`).join(' ');
      const searchable = `${fullName} ${student.jobTitle || ''} ${student.location || ''} ${student.school?.name || ''} ${student.company?.name || ''} ${skillNames} ${tagNames} ${projectNames}`.toLowerCase();
      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      const matchesSkill =
        !skill ||
        student.skills?.some((item) => item.name?.toLowerCase().includes(skill.toLowerCase())) ||
        normalizeTagList(student.tags).some((item) => item.toLowerCase().includes(skill.toLowerCase()));
      const matchesLevel =
        !level ||
        student.skills?.some((item) => item.level?.toLowerCase().includes(level.toLowerCase()));

      return matchesSearch && matchesSkill && matchesLevel;
    });

    if (sort === 'name') {
      return [...results].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
    }

    return results;
  }, [level, search, skill, sort, students]);

  const visibleStudents = useMemo(() => filteredStudents, [filteredStudents]);
  const totalPages = Math.max(1, Math.ceil(visibleStudents.length / pageSize));
  const paginated = useMemo(() => visibleStudents.slice((page - 1) * pageSize, page * pageSize), [visibleStudents, page, pageSize]);

  const featuredSkills = useMemo(() => {
    const skills = students.flatMap((student) => student.skills || []);
    const uniqueSkills = Array.from(
      new Map(
        skills
          .filter((skill) => skill?.name)
          .map((skill) => [skill.name.toLowerCase(), skill])
      ).values()
    );

    return uniqueSkills.length ? uniqueSkills.slice(0, 12) : [
      { name: 'React', level: 'Advanced' },
      { name: 'TypeScript', level: 'Intermédiaire' },
      { name: 'Figma', level: 'Advanced' },
    ];
  }, [students]);

  const activeProfile =
    (selectedStudent && filteredStudents.some((student) => student.id === selectedStudent.id)
      ? selectedStudent
      : visibleStudents[0]) || students[0];

  useEffect(() => {
    if (!selectedStudent) return;
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 1200) return;

    profileDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedStudent]);

  const selectedSummaryProfile = useMemo(() => {
    if (!activeProfile) return null;
    const skillNames = (activeProfile.skills || [])
      .map((skill) => (typeof skill === 'string' ? skill : skill?.name))
      .filter(Boolean);
    const tagNames = normalizeTagList(activeProfile.tags);
    const companyPending =
      activeProfile.pendingCompanyStatus === 'pending'
      && String(activeProfile.pendingCompanyId || '') === String(activeProfile.company?.id || '');
    const visibleCompanyName = companyPending ? '' : (activeProfile.company?.name || '');

    return {
      firstName: activeProfile.firstName || '',
      lastName: activeProfile.lastName || '',
      email: activeProfile.email || '',
      headline: activeProfile.jobTitle || '',
      jobTitle: activeProfile.jobTitle || '',
      location: activeProfile.location || '',
      age: activeProfile.age || '',
      skills: skillNames,
      tags: tagNames,
      schoolName: activeProfile.school?.name || '',
      companyName: visibleCompanyName,
      companyPending,
      projects: normalizeProjects(activeProfile.projects),
      bio: activeProfile.bio || `Profil étudiant orienté ${activeProfile.jobTitle || 'numérique'} à ${activeProfile.location || 'localisation non renseignée'}.`,
    };
  }, [activeProfile]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'var(--page-bg)', color: 'var(--text-primary)', pb: 4 }}>
      <Container maxWidth={false} sx={{ maxWidth: 1240, py: { xs: 1.5, md: 3 } }}>
        <Paper
          elevation={0}
          sx={{
            overflow: 'hidden',
            borderRadius: 3,
            bgcolor: 'var(--accent-strong)',
            color: '#fff',
            boxShadow: '0 20px 50px rgba(22, 65, 106, 0.25)',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.35fr 1fr' },
              gap: { xs: 4, md: 7 },
              p: { xs: 3, sm: 4, md: 5 },
              background: 'linear-gradient(135deg, #234f7c 0%, #2c6599 100%)',
            }}
          >
            <Box>
              <Typography variant="overline" sx={{ letterSpacing: 3, opacity: 0.75 }}>
                Ecole Hexagone
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
                Hexagone (got) Talents
              </Typography>
              <Typography variant="overline" sx={{ color: '#ffc21c', fontWeight: 900, letterSpacing: 2 }}>
                Talents étudiants
              </Typography>
              <Typography
                component="h1"
                sx={{
                  maxWidth: 650,
                  mt: 1,
                  fontSize: { xs: 36, sm: 44, md: 54 },
                  lineHeight: 0.96,
                  fontWeight: 950,
                  letterSpacing: 0,
                }}
              >
                Une vitrine plus propre, plus claire et plus credible pour les profils Hexagone.
              </Typography>
              <Typography sx={{ maxWidth: 520, mt: 2, color: 'rgba(255,255,255,.72)' }}>
                La plateforme valorise les étudiants, facilite la consultation des profils et pose
                une base sérieuse pour la mise en relation avec les entreprises.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={() => document.getElementById('talents-search')?.focus()}
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
                  Explorer les talents
                </Button>
              </Stack>
            </Box>

            <Stack spacing={1.6}>
              <Stack direction="row" spacing={1} sx={{ justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <Chip label="GotT digital" size="small" sx={{ bgcolor: 'background.paper', fontWeight: 900 }} />
                <Button
                  type="button"
                  onClick={toggleMode}
                  startIcon={mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: 'rgba(255,255,255,.75)',
                    color: '#fff',
                    textTransform: 'none',
                    fontWeight: 900,
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,.95)',
                      bgcolor: 'rgba(255,255,255,.12)',
                    },
                  }}
                >
                  {mode === 'dark' ? 'Mode clair' : 'Mode sombre'}
                </Button>
              </Stack>
              <Paper elevation={0} sx={{ p: 2.2, borderRadius: 2, bgcolor: 'rgba(255,255,255,.1)', color: '#fff' }}>
                <Typography variant="overline" sx={{ color: '#ffc21c', fontWeight: 900, letterSpacing: 2 }}>
                  Promesse produit
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.74)' }}>
                  Une expérience plus soignée et rassurante qu'un dashboard générique, tout en
                  restant fluide, responsive et simple à faire évoluer.
                </Typography>
              </Paper>
              {heroCards.map(([title, copy]) => (
                <Paper key={title} elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,.1)', color: '#fff' }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 900 }}>{title}</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.68)' }}>
                    {copy}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Box>
        </Paper>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            mt: 2,
            boxShadow: '0 12px 30px rgba(20, 41, 63, 0.06)',
          }}
        >
          {[
            ['Profils disponibles', students.length],
            ['Profils visibles', visibleStudents.length],
            ['Profils à affiner', filteredStudents.length],
            ['Competences avancees', featuredSkills.length],
          ].map(([label, value]) => (
            <Box key={label} sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="overline" sx={{ color: 'var(--text-secondary)', letterSpacing: 2, fontWeight: 900 }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: 34, lineHeight: 1, fontWeight: 950, color: 'var(--text-primary)' }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 2.4, mt: 2 }}>
          <Box sx={{ order: { xs: 2, lg: 1 } }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="overline" sx={{ color: 'var(--text-secondary)', letterSpacing: 2, fontWeight: 900 }}>
                  Mission produit
                </Typography>
                <Typography component="h2" sx={{ maxWidth: 520, fontSize: { xs: 26, md: 32 }, lineHeight: 1.05, fontWeight: 950 }}>
                  Identifier rapidement les bons profils étudiants.
                </Typography>
              </Box>
              <Typography sx={{ maxWidth: 470, alignSelf: 'end', color: 'var(--text-secondary)', fontSize: 14 }}>
                Cette vue regroupe les talents, les filtres utiles et un aperçu détaillé pour
                faciliter la consultation côté entreprise comme côté école.
              </Typography>
            </Stack>

            <Paper elevation={0} sx={{ p: 2, borderRadius: 0, border: '1px solid #e8edf2', mb: 2 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' } }}>
                <Box>
                  <Typography variant="overline" sx={{ color: 'var(--text-secondary)', letterSpacing: 2, fontWeight: 900 }}>
                    Recherche intelligente
                  </Typography>
                  <Typography sx={{ fontSize: 20, fontWeight: 900 }}>Explorer les profils étudiants</Typography>
                  <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                    Filtrez par nom, niveau, compétence ou stack projet.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                      setSearch('');
                      setLevel('');
                      setSkill('');
                      refresh();
                    }}
                    disabled={loading}
                    sx={{ borderRadius: 99, textTransform: 'none', fontWeight: 800 }}
                  >
                    Réinitialiser
                  </Button>
                </Stack>
              </Stack>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: '1.3fr repeat(4, 1fr)' },
                  gap: 1,
                  mt: 2,
                }}
              >
                <TextField
                  id="talents-search"
                  label="Recherche"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  size="small"
                  placeholder="Prenom, nom ou localisation"
                />
                <FormControl size="small">
                  <InputLabel>Niveau</InputLabel>
                  <Select label="Niveau" value={level} onChange={(event) => setLevel(event.target.value)}>
                    <MenuItem value="">Tous</MenuItem>
                    <MenuItem value="advanced">Advanced</MenuItem>
                    <MenuItem value="interm">Intermediaire</MenuItem>
                    <MenuItem value="debut">Debutant</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <InputLabel>Competence</InputLabel>
                  <Select label="Competence" value={skill} onChange={(event) => setSkill(event.target.value)}>
                    <MenuItem value="">Toutes</MenuItem>
                    {featuredSkills.map((item, index) => (
                      <MenuItem key={`${item.name}-${index}`} value={item.name}>
                        {item.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <InputLabel>Technologie projet</InputLabel>
                  <Select label="Technologie projet" value={skill} onChange={(event) => setSkill(event.target.value)}>
                    <MenuItem value="">Toutes</MenuItem>
                    <MenuItem value="React">React</MenuItem>
                    <MenuItem value="Node">Node.js</MenuItem>
                    <MenuItem value="Figma">Figma</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <InputLabel>Trier par</InputLabel>
                  <Select label="Trier par" value={sort} onChange={(event) => setSort(event.target.value)}>
                    <MenuItem value="featured">Mis en avant</MenuItem>
                    <MenuItem value="name">Nom</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Paper>

            <ErrorAlert error={error} onClose={refresh} />
            <LoadingIndicator loading={loading} />

            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'end', mb: 1.5 }}>
              <Box>
                <Typography variant="overline" sx={{ color: 'var(--text-secondary)', letterSpacing: 2, fontWeight: 900 }}>
                  Selection de profils
                </Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 900 }}>
                  {filteredStudents.length} profils visibles
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ maxWidth: 390, color: 'var(--text-secondary)', display: { xs: 'none', md: 'block' } }}>
                Une grille plus sobre pour parcourir les talents sans surcharger la lecture.
              </Typography>
            </Stack>

            {!loading && filteredStudents.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px dashed var(--border-color)' }}>
                <Typography sx={{ fontWeight: 800 }}>Aucun profil ne correspond aux filtres.</Typography>
              </Paper>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.6 }}>
                    {paginated.map((student) => (
                      <StudentCard
                        key={student.id}
                        student={student}
                        selected={activeProfile?.id === student.id}
                        onSelect={setSelectedStudent}
                      />
                    ))}
              </Box>
            )}

                <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: 'center' }}>
                  <Button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Précédent</Button>
                  <Typography sx={{ mx: 1 }}>{page} / {totalPages}</Typography>
                  <Button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Suivant</Button>
                  <FormControl size="small" sx={{ ml: 2 }}>
                    <InputLabel>Par page</InputLabel>
                    <Select value={pageSize} label="Par page" onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                      <MenuItem value={6}>6</MenuItem>
                      <MenuItem value={12}>12</MenuItem>
                      <MenuItem value={24}>24</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
          </Box>

          <Box ref={profileDetailRef} sx={{ order: { xs: 1, lg: 2 }, position: { lg: 'sticky' }, top: 20, alignSelf: 'start' }}>
            <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', overflow: 'hidden', boxShadow: '0 18px 44px rgba(17, 36, 59, .1)' }}>
              {activeProfile ? (
                <>
                  <Box sx={{ p: 2.3, bgcolor: 'var(--surface-soft)' }}>
                    <Stack direction="row" spacing={1.6} sx={{ alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: 'var(--accent-soft)', color: 'var(--accent-strong)', fontWeight: 900 }}>{getInitials(activeProfile)}</Avatar>
                      <Box>
                        <Typography variant="overline" sx={{ color: 'var(--text-secondary)', letterSpacing: 2, fontWeight: 900 }}>
                          Profil selectionne
                        </Typography>
                        <Typography sx={{ fontSize: 26, lineHeight: 1, fontWeight: 950 }}>
                          {activeProfile.firstName} {activeProfile.lastName}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                          {activeProfile.jobTitle || 'Profil étudiant'} - {activeProfile.age || '--'} ans
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                          École:{' '}
                          {activeProfile.school?.id && isKnownName(activeProfile.school?.name) ? (
                            <Link
                              component={RouterLink}
                              to={`/schools/${activeProfile.school.id}`}
                              onClick={(event) => event.stopPropagation()}
                              underline="hover"
                              sx={{ color: 'var(--text-secondary)', fontWeight: 800 }}
                            >
                              {activeProfile.school.name || 'Inconnue'}
                            </Link>
                          ) : (
                            'Inconnue'
                          )}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                          Entreprise:{' '}
                          {activeProfile.company?.id && isKnownName(activeProfile.company?.name) && !(activeProfile.pendingCompanyStatus === 'pending' && String(activeProfile.pendingCompanyId || '') === String(activeProfile.company?.id || '')) ? (
                            <Link
                              component={RouterLink}
                              to={`/companies/${activeProfile.company.id}`}
                              onClick={(event) => event.stopPropagation()}
                              underline="hover"
                              sx={{ color: 'var(--text-secondary)', fontWeight: 800 }}
                            >
                              {activeProfile.company.name}
                            </Link>
                          ) : (
                            'Inconnue'
                          )}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  <Box sx={{ p: 2.3, bgcolor: 'background.paper' }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                      {[
                        ['Email', activeProfile.email || `${activeProfile.firstName || 'talent'}.${activeProfile.lastName || 'hexagone'}@theque.dev`],
                        ['Role', activeProfile.jobTitle || 'Frontend Developer'],
                        ['École', activeProfile.school?.name || 'Inconnue'],
                        ['Entreprise', activeProfile.company?.name || 'Inconnue'],
                        ['Localisation', activeProfile.location || 'Paris'],
                        ['Positionnement', 'Profil mis en avant'],
                      ].map(([label, value]) => (
                        <Paper
                          key={label}
                          elevation={0}
                          component={label === 'Email' ? Link : 'div'}
                          href={label === 'Email' ? `mailto:${value}` : undefined}
                          underline={label === 'Email' ? 'none' : undefined}
                          sx={{
                            p: 1.4,
                            borderRadius: 1.5,
                            bgcolor: 'var(--muted-bg)',
                            border: '1px solid',
                            borderColor: 'var(--muted-border)',
                            transition: 'transform .15s ease, box-shadow .15s ease, border-color .15s ease, background-color .15s ease',
                            ...(label === 'Email'
                              ? {
                                  cursor: 'pointer',
                                  '&:hover': {
                                    transform: 'translateY(-1px)',
                                    bgcolor: '#efe3cf',
                                    borderColor: '#d9c39d',
                                    boxShadow: '0 8px 18px rgba(16, 35, 57, 0.08)',
                                  },
                                }
                              : {}),
                          }}
                        >
                          <Typography variant="overline" sx={{ color: 'var(--warning, #8a5a00)', fontSize: 10, fontWeight: 900, letterSpacing: 1.4 }}>
                            {label}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 900,
                              color: 'var(--text-primary)',
                              wordBreak: 'break-word',
                              mt: 0.25,
                              ...(label === 'Email'
                                ? {
                                    transition: 'color .15s ease',
                                    '&:hover': { color: 'var(--accent)' },
                                  }
                                : {}),
                            }}
                          >
                            {value}
                          </Typography>
                        </Paper>
                      ))}
                    </Box>

                    <Section title="A propos">
                      <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 1.2 }}>
                        Présentation rapide pour comprendre le profil sans surcharge visuelle.
                      </Typography>
                      <Paper elevation={0} sx={{ p: 1.6, borderRadius: 1.5, bgcolor: 'var(--muted-bg-alt)' }}>
                        <Typography variant="body2">
                          {activeProfile.bio || 'Aucune bio renseignée pour le moment.'}
                        </Typography>
                      </Paper>
                    </Section>

                    <SmartSummaryBox
                      key={activeProfile?.id}
                      type="student"
                      profile={selectedSummaryProfile}
                      title="Résumé intelligent du profil"
                      description="Clique pour générer une version courte et propre du profil sélectionné."
                    />

                    <Section title="Competences">
                      <Stack direction="row" gap={0.8} sx={{ flexWrap: 'wrap' }}>
                        {(activeProfile.skills?.length ? activeProfile.skills : featuredSkills).slice(0, 5).map((item, index) => (
                          <Chip
                            key={`${item.name}-${index}`}
                            label={`${item.name} ${item.level || 'Intermédiaire'}`}
                            size="small"
                            sx={{ borderRadius: 99, bgcolor: 'var(--muted-bg)', border: '1px solid var(--muted-border)', fontWeight: 700 }}
                          />
                        ))}
                      </Stack>
                    </Section>

                    <Section title="Tags">
                      <Stack direction="row" gap={0.8} sx={{ flexWrap: 'wrap' }}>
                        {normalizeTagList(activeProfile.tags).length ? (
                          normalizeTagList(activeProfile.tags).map((tag) => (
                            <Chip
                              key={tag}
                              label={tag}
                              size="small"
                              sx={{
                                borderRadius: 99,
                                bgcolor: 'var(--accent-soft)',
                                color: 'var(--accent-strong)',
                                fontWeight: 700,
                                border: '1px solid var(--muted-border)',
                              }}
                            />
                          ))
                        ) : (
                          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                            Aucun tag renseigné par cet étudiant.
                          </Typography>
                        )}
                      </Stack>
                    </Section>

                    <Section title="Projets">
                      <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                        {normalizeProjects(activeProfile.projects).length} réalisation{normalizeProjects(activeProfile.projects).length > 1 ? 's' : ''} renseignée{normalizeProjects(activeProfile.projects).length > 1 ? 's' : ''} pour évaluer le niveau et les outils.
                      </Typography>
                      <Divider sx={{ my: 1.2 }} />
                      {normalizeProjects(activeProfile.projects).length > 0 ? (
                        normalizeProjects(activeProfile.projects).slice(0, 3).map((project, index) => (
                          <Box key={`${project.name || project.description || index}`} sx={{ mb: 1.2 }}>
                            <Typography sx={{ fontWeight: 900 }}>{project.name || 'Projet'}</Typography>
                            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                              {project.description || 'Aucune description renseignée pour ce projet.'}
                            </Typography>
                            {project.link && (
                              <Link
                                href={project.link}
                                target="_blank"
                                rel="noreferrer"
                                underline="hover"
                                sx={{ color: 'var(--accent)', fontSize: 12, fontWeight: 800 }}
                              >
                                Voir le projet
                              </Link>
                            )}
                          </Box>
                        ))
                      ) : (
                        <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                          Aucun projet n’a encore été ajouté par cet étudiant.
                        </Typography>
                      )}
                    </Section>
                  </Box>
                </>
              ) : (
                <Box sx={{ p: 3 }}>
                  <Typography sx={{ fontWeight: 900 }}>Aucun profil sélectionné</Typography>
                </Box>
              )}
            </Paper>
          </Box>
        </Box>

        <Paper elevation={0} sx={{ mt: 3, p: 1.6, borderRadius: 2, color: 'var(--text-secondary)', fontSize: 12 }}>
          Interface alignée sur l'esprit du brief Hexagone (got) Talents. Les logos officiels
          pourront être intégrés ensuite sans refaire la structure.
        </Paper>
      </Container>

    </Box>
  );
};

const Section = ({ title, children }) => (
  <Box sx={{ mt: 2, p: 1.6, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
    <Typography sx={{ fontWeight: 900, mb: 0.8 }}>{title}</Typography>
    {children}
  </Box>
);
