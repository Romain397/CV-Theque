import { useMemo, useState } from 'react';
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
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { Link as RouterLink } from 'react-router-dom';
import { useStudents } from '../hooks/useStudents';
import { StudentCard } from './StudentCard';
import { LoadingIndicator } from './LoadingIndicator';
import { ErrorAlert } from './ErrorAlert';

const getInitials = (student) =>
  `${student?.firstName?.[0] || ''}${student?.lastName?.[0] || ''}`.toUpperCase() || 'LB';

const heroCards = [
  ['Profils valorisés', 'Des pages lisibles pour présenter parcours, compétences et projets.'],
  ['Mise en relation', 'Une recherche rapide pour aider les entreprises à trouver les bons talents.'],
  ['Base évolutive', "Une interface claire, prête pour l'intégration avec l'API et les logos."],
];

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

  const [formOpen, setFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [formStudent, setFormStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [skill, setSkill] = useState('');
  const [sort, setSort] = useState('featured');
  const maxVisibleProfiles = 6;

  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const results = students.filter((student) => {
      const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase();
      const searchable = `${fullName} ${student.jobTitle || ''} ${student.location || ''} ${student.school?.name || ''} ${student.company?.name || ''}`.toLowerCase();
      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      const matchesSkill =
        !skill ||
        student.skills?.some((item) => item.name?.toLowerCase().includes(skill.toLowerCase()));
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

  const visibleStudents = useMemo(
    () => filteredStudents.slice(0, maxVisibleProfiles),
    [filteredStudents]
  );

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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f7f8fa', color: '#102339', pb: 4 }}>
      <Container maxWidth={false} sx={{ maxWidth: 1240, py: { xs: 1.5, md: 3 } }}>
        <Paper
          elevation={0}
          sx={{
            overflow: 'hidden',
            borderRadius: 3,
            bgcolor: '#245a8c',
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
                    color: '#102339',
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
                <Chip label="CVtheque digitale" size="small" sx={{ bgcolor: '#fff', fontWeight: 900 }} />
                <Chip
                  icon={<DarkModeOutlinedIcon />}
                  label="Mode sombre"
                  size="small"
                  sx={{
                    border: '1px solid rgba(255,255,255,.75)',
                    color: '#fff',
                    '& .MuiChip-icon': { color: '#fff' },
                  }}
                  variant="outlined"
                />
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
            <Box key={label} sx={{ p: 2, bgcolor: '#fff', border: '1px solid #edf1f5' }}>
              <Typography variant="overline" sx={{ color: '#7b8794', letterSpacing: 2, fontWeight: 900 }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: 34, lineHeight: 1, fontWeight: 950, color: '#102339' }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 2.4, mt: 2 }}>
          <Box>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="overline" sx={{ color: '#7b8794', letterSpacing: 2, fontWeight: 900 }}>
                  Mission produit
                </Typography>
                <Typography component="h2" sx={{ maxWidth: 520, fontSize: { xs: 26, md: 32 }, lineHeight: 1.05, fontWeight: 950 }}>
                  Identifier rapidement les bons profils étudiants.
                </Typography>
              </Box>
              <Typography sx={{ maxWidth: 470, alignSelf: 'end', color: '#708094', fontSize: 14 }}>
                Cette vue regroupe les talents, les filtres utiles et un aperçu détaillé pour
                faciliter la consultation côté entreprise comme côté école.
              </Typography>
            </Stack>

            <Paper elevation={0} sx={{ p: 2, borderRadius: 0, border: '1px solid #e8edf2', mb: 2 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' } }}>
                <Box>
                  <Typography variant="overline" sx={{ color: '#7b8794', letterSpacing: 2, fontWeight: 900 }}>
                    Recherche intelligente
                  </Typography>
                  <Typography sx={{ fontSize: 20, fontWeight: 900 }}>Explorer les profils étudiants</Typography>
                  <Typography variant="body2" sx={{ color: '#6d7c8f' }}>
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
                <Typography variant="overline" sx={{ color: '#7b8794', letterSpacing: 2, fontWeight: 900 }}>
                  Selection de profils
                </Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 900 }}>
                  {filteredStudents.length} profils visibles
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ maxWidth: 390, color: '#708094', display: { xs: 'none', md: 'block' } }}>
                Une grille plus sobre pour parcourir les talents sans surcharger la lecture.
              </Typography>
            </Stack>

            {!loading && filteredStudents.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px dashed #cbd5df' }}>
                <Typography sx={{ fontWeight: 800 }}>Aucun profil ne correspond aux filtres.</Typography>
              </Paper>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.6 }}>
                {visibleStudents.map((student) => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    selected={activeProfile?.id === student.id}
                    onSelect={setSelectedStudent}
                  />
                ))}
              </Box>
            )}
          </Box>

          <Box sx={{ position: { lg: 'sticky' }, top: 20, alignSelf: 'start' }}>
            <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e5ebf1', overflow: 'hidden', boxShadow: '0 18px 44px rgba(17, 36, 59, .1)' }}>
              {activeProfile ? (
                <>
                  <Box sx={{ p: 2.3, bgcolor: '#f8fafc' }}>
                    <Stack direction="row" spacing={1.6} sx={{ alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: '#dceaf7', color: '#214a71', fontWeight: 900 }}>{getInitials(activeProfile)}</Avatar>
                      <Box>
                        <Typography variant="overline" sx={{ color: '#7b8794', letterSpacing: 2, fontWeight: 900 }}>
                          Profil selectionne
                        </Typography>
                        <Typography sx={{ fontSize: 26, lineHeight: 1, fontWeight: 950 }}>
                          {activeProfile.firstName} {activeProfile.lastName}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#627386' }}>
                          {activeProfile.jobTitle || 'Profil étudiant'} - {activeProfile.age || '--'} ans
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#627386' }}>
                          École:{' '}
                          {activeProfile.school?.id ? (
                            <Link
                              component={RouterLink}
                              to={`/schools/${activeProfile.school.id}`}
                              onClick={(event) => event.stopPropagation()}
                              underline="hover"
                              sx={{ color: '#627386', fontWeight: 800 }}
                            >
                              {activeProfile.school.name}
                            </Link>
                          ) : (
                            'Non renseignée'
                          )}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#627386' }}>
                          Entreprise:{' '}
                          {activeProfile.company?.id ? (
                            <Link
                              component={RouterLink}
                              to={`/companies/${activeProfile.company.id}`}
                              onClick={(event) => event.stopPropagation()}
                              underline="hover"
                              sx={{ color: '#627386', fontWeight: 800 }}
                            >
                              {activeProfile.company.name}
                            </Link>
                          ) : (
                            'Non renseignée'
                          )}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  <Box sx={{ p: 2.3 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                      {[
                        ['Email', `${activeProfile.firstName || 'talent'}.${activeProfile.lastName || 'hexagone'}@theque.dev`],
                        ['Role', activeProfile.jobTitle || 'Frontend Developer'],
                        ['École', activeProfile.school?.name || 'Non renseignée'],
                        ['Entreprise', activeProfile.company?.name || 'Non renseignée'],
                        ['Localisation', activeProfile.location || 'Paris'],
                        ['Positionnement', 'Profil mis en avant'],
                      ].map(([label, value]) => (
                        <Paper key={label} elevation={0} sx={{ p: 1.4, borderRadius: 1.5, bgcolor: '#f5efe2', border: '1px solid #e9ddc8' }}>
                          <Typography variant="overline" sx={{ color: '#6c604b', fontSize: 10, fontWeight: 900, letterSpacing: 1.4 }}>
                            {label}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 900, color: '#102339', wordBreak: 'break-word' }}>
                            {value}
                          </Typography>
                        </Paper>
                      ))}
                    </Box>

                    <Section title="A propos">
                      <Typography variant="body2" sx={{ color: '#607287', mb: 1.2 }}>
                        Présentation rapide pour comprendre le profil sans surcharge visuelle.
                      </Typography>
                      <Paper elevation={0} sx={{ p: 1.6, borderRadius: 1.5, bgcolor: '#f7f0df' }}>
                        <Typography variant="body2">
                          Etudiant en ingénierie web, passionné par les interfaces produit, la
                          qualité visuelle et les expériences fluides.
                        </Typography>
                      </Paper>
                    </Section>

                    <Section title="Competences">
                      <Stack direction="row" gap={0.8} sx={{ flexWrap: 'wrap' }}>
                        {(activeProfile.skills?.length ? activeProfile.skills : featuredSkills).slice(0, 5).map((item, index) => (
                          <Chip
                            key={`${item.name}-${index}`}
                            label={`${item.name} ${item.level || 'Advanced'}`}
                            size="small"
                            sx={{ borderRadius: 99, bgcolor: '#f5efe2', border: '1px solid #e9ddc8', fontWeight: 700 }}
                          />
                        ))}
                      </Stack>
                    </Section>

                    <Section title="Projets">
                      <Typography variant="caption" sx={{ color: '#607287' }}>
                        {activeProfile.projects?.length || 2} réalisations pour évaluer le niveau et les outils.
                      </Typography>
                      <Divider sx={{ my: 1.2 }} />
                      {(activeProfile.projects?.length ? activeProfile.projects : ['Talent Match', 'Design System Campus']).slice(0, 2).map((project, index) => (
                        <Box key={`${project.name || project}-${index}`} sx={{ mb: 1.2 }}>
                          <Typography sx={{ fontWeight: 900 }}>{project.name || project}</Typography>
                          <Typography variant="body2" sx={{ color: '#607287' }}>
                            {project.description || 'Projet construit pour harmoniser les interfaces et faciliter la lecture des profils.'}
                          </Typography>
                        </Box>
                      ))}
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

        <Paper elevation={0} sx={{ mt: 3, p: 1.6, borderRadius: 2, color: '#8693a2', fontSize: 12 }}>
          Interface alignée sur l'esprit du brief Hexagone (got) Talents. Les logos officiels
          pourront être intégrés ensuite sans refaire la structure.
        </Paper>
      </Container>

    </Box>
  );
};

const Section = ({ title, children }) => (
  <Box sx={{ mt: 2, p: 1.6, borderRadius: 1.5, border: '1px solid #e5ebf1' }}>
    <Typography sx={{ fontWeight: 900, mb: 0.8 }}>{title}</Typography>
    {children}
  </Box>
);
