import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import PublicIcon from '@mui/icons-material/Public';
import { useAuth } from '../auth';
import * as schoolsService from '../services/schoolsService';
import { useStudents } from '../hooks/useStudents';
import { getSchoolProfile } from '../data/entityProfiles';
import TagChipsInput from '../components/TagChipsInput';

const initial = (name) => (name?.[0] || 'S').toUpperCase();

export default function SchoolProfile() {
  const { id } = useParams();
  const { students } = useStudents();
  const { user } = useAuth();
  const [school, setSchool] = useState(null);
  const [selectedSection, setSelectedSection] = useState('overview');
  const [editDraft, setEditDraft] = useState({ name: '', location: '', specialtiesTags: [] });
  const [editMessage, setEditMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    schoolsService.getSchools().then((items) => {
      if (mounted) {
        setSchool(items.find((item) => String(item.id) === String(id)) || items[0] || null);
      }
    });

    return () => {
      mounted = false;
    };
  }, [id]);

  const profile = getSchoolProfile(school);
  const linkedStudents = useMemo(
    () => students.filter((student) => String(student.school?.id) === String(school?.id)),
    [school, students]
  );

  const canEdit = Boolean(user && (user.role === 'admin' || String(user.profile?.schoolId) === String(school?.id)));

  useEffect(() => {
    if (!school) return;

    setEditDraft({
      name: school.name || '',
      location: school.location || '',
      specialtiesTags: [...(profile.specialties || [])],
    });
  }, [profile.specialties, school]);

  const openLinkedStudents = () => {
    setSelectedSection('students');
  };

  if (!school) {
    return (
      <Container sx={{ py: 4 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>Chargement du profil école...</Paper>
      </Container>
    );
  }

  const splitTags = (value = '') => Array.from(new Set(value.split(',').map((item) => item.trim()).filter(Boolean)));

  const handleSave = async (event) => {
    event.preventDefault();
    if (!canEdit || !school) return;

    setSaving(true);
    setEditMessage(null);

    try {
      const updatedSchool = await schoolsService.updateSchool(school.id, {
        name: editDraft.name || school.name,
        location: editDraft.location || '',
        specialties: splitTags(editDraft.specialtiesTags || []),
      });

      setSchool(updatedSchool);
      setEditMessage({ type: 'success', text: 'Fiche école enregistrée.' });
    } catch (error) {
      setEditMessage({ type: 'error', text: error?.message || 'Impossible de sauvegarder la fiche école.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container sx={{ py: 4 }}>
      <Paper
        elevation={0}
        sx={{
          overflow: 'hidden',
          borderRadius: 4,
          border: '1px solid #e4eaf1',
          boxShadow: '0 24px 60px rgba(17, 36, 59, 0.12)',
        }}
      >
        <Box sx={{ p: { xs: 3, md: 4 }, bgcolor: '#214a71', color: '#fff' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={2.2} sx={{ alignItems: 'center' }}>
              <Avatar sx={{ width: 72, height: 72, bgcolor: '#f5c542', color: '#102339', fontWeight: 900, fontSize: 28 }}>
                {initial(school.name)}
              </Avatar>
              <Box>
                <Chip label="École" size="small" sx={{ bgcolor: '#fff', fontWeight: 900 }} />
                <Typography variant="h4" sx={{ fontWeight: 950, mt: 1 }}>
                  {school.name}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,.8)', maxWidth: 700 }}>
                  {profile.tagline}
                </Typography>
              </Box>
            </Stack>

            <Stack spacing={1} sx={{ minWidth: 220 }}>
              {profile.socials.slice(0, 2).map((social) => (
                <Button
                  key={social.label}
                  component="a"
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  variant="outlined"
                  sx={{ borderColor: 'rgba(255,255,255,.55)', color: '#fff', justifyContent: 'space-between', textTransform: 'none' }}
                  endIcon={<PublicIcon fontSize="small" />}
                >
                  {social.label}
                </Button>
              ))}
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 3, md: 4 }, bgcolor: '#f7f8fa' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {profile.metrics.map((metric) => (
              <Paper key={metric.label} elevation={0} sx={{ flex: 1, p: 2, borderRadius: 3, border: '1px solid #e5ebf1' }}>
                <Typography variant="overline" sx={{ letterSpacing: 2, color: '#6d7c8f', fontWeight: 900 }}>
                  {metric.label}
                </Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 950, color: '#102339' }}>
                  {metric.value}
                </Typography>
              </Paper>
            ))}
            <Paper
              elevation={0}
              onClick={openLinkedStudents}
              sx={{
                flex: 1,
                p: 2,
                borderRadius: 3,
                border: '1px solid #e5ebf1',
                cursor: 'pointer',
                bgcolor: selectedSection === 'students' ? '#eef6ff' : '#fff',
                transition: 'transform .2s ease, box-shadow .2s ease',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 28px rgba(17, 36, 59, 0.08)' },
              }}
            >
              <Typography variant="overline" sx={{ letterSpacing: 2, color: '#6d7c8f', fontWeight: 900 }}>
                Étudiants répertoriés
              </Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 950, color: '#102339' }}>
                {linkedStudents.length}
              </Typography>
              <Typography variant="caption" sx={{ color: '#607287' }}>
                Cliquez pour voir la liste
              </Typography>
            </Paper>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2.5, mt: 3 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e5ebf1' }}>
              <Typography variant="overline" sx={{ letterSpacing: 2, color: '#6d7c8f', fontWeight: 900 }}>
                À propos
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 950, mt: 1 }}>
                {profile.summary}
              </Typography>
              <Typography sx={{ color: '#607287', mt: 1.5 }}>
                Une page profil pensée comme un mini LinkedIn: présentation claire, repères visuels, et accès direct aux canaux publics.
              </Typography>

              <Stack direction="row" gap={1} sx={{ mt: 2.5, flexWrap: 'wrap' }}>
                {profile.specialties.map((item) => (
                  <Chip key={item} label={item} sx={{ bgcolor: '#eef4fb', fontWeight: 800 }} icon={<SchoolIcon />} />
                ))}
              </Stack>

              <Box sx={{ mt: 3 }}>
                {profile.highlights.map((item) => (
                  <Paper key={item} elevation={0} sx={{ p: 1.6, borderRadius: 2, bgcolor: '#fff', border: '1px solid #edf1f5', mb: 1.2 }}>
                    <Typography sx={{ fontWeight: 700 }}>{item}</Typography>
                  </Paper>
                ))}
              </Box>
            </Paper>

            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e5ebf1', bgcolor: '#fff' }}>
              <Typography variant="overline" sx={{ letterSpacing: 2, color: '#6d7c8f', fontWeight: 900 }}>
                Réseaux
              </Typography>
              <Stack spacing={1.2} sx={{ mt: 2 }}>
                {profile.socials.map((social) => (
                  <Button
                    key={social.label}
                    component="a"
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    variant="outlined"
                    sx={{ justifyContent: 'space-between', textTransform: 'none' }}
                    endIcon={<PublicIcon fontSize="small" />}
                  >
                    {social.label}
                  </Button>
                ))}
              </Stack>

              <Box sx={{ mt: 3, p: 2, borderRadius: 3, bgcolor: '#f5efe2' }}>
                <Typography sx={{ fontWeight: 900 }}>Vie étudiante</Typography>
                <Typography variant="body2" sx={{ color: '#607287', mt: 0.5 }}>
                  Clubs, hackathons, alternance et accompagnement carrière sont mis en avant pour rassurer les candidats.
                </Typography>
              </Box>
            </Paper>
          </Box>

          {selectedSection === 'students' && (
            <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3, border: '1px solid #e5ebf1' }}>
              <Typography variant="overline" sx={{ letterSpacing: 2, color: '#6d7c8f', fontWeight: 900 }}>
                Étudiants liés à {school.name}
              </Typography>
              {linkedStudents.length ? (
                <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.2 }}>
                  {linkedStudents.map((student) => (
                    <Paper key={student.id} elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: '#fff', border: '1px solid #edf1f5' }}>
                      <Typography sx={{ fontWeight: 900 }}>
                        {student.firstName} {student.lastName}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#607287' }}>
                        {student.jobTitle} - {student.location}
                      </Typography>
                      {student.company?.id ? (
                        <Link component={RouterLink} to={`/companies/${student.company.id}`} underline="hover" sx={{ color: '#1f5f9d', fontWeight: 800 }}>
                          Entreprise: {student.company.name}
                        </Link>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#7a8794' }}>
                          Entreprise non renseignée
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ mt: 1.5, color: '#607287' }}>Aucun étudiant n’est encore répertorié pour cette école.</Typography>
              )}
            </Paper>
          )}

          {canEdit && (
            <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3, border: '1px solid #e5ebf1', bgcolor: '#fff' }}>
              <Typography variant="overline" sx={{ letterSpacing: 2, color: '#6d7c8f', fontWeight: 900 }}>
                Modifier ma fiche école
              </Typography>
              <Typography sx={{ fontWeight: 900, mt: 0.5 }}>Contenu public et spécialités</Typography>

              {editMessage && (
                <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: editMessage.type === 'success' ? '#ecfdf3' : '#fff5f5', color: editMessage.type === 'success' ? '#027a48' : '#b42318' }}>
                  <Typography sx={{ fontWeight: 800 }}>{editMessage.text}</Typography>
                </Box>
              )}

              <Box component="form" onSubmit={handleSave} sx={{ mt: 2, display: 'grid', gap: 1.5 }}>
                <TextField label="Nom" value={editDraft.name} onChange={(event) => setEditDraft((previous) => ({ ...previous, name: event.target.value }))} />
                <TextField label="Localisation" value={editDraft.location} onChange={(event) => setEditDraft((previous) => ({ ...previous, location: event.target.value }))} />
                <TagChipsInput
                  label="Spécialités"
                  tags={editDraft.specialtiesTags || []}
                  onChange={(nextTags) => setEditDraft((previous) => ({ ...previous, specialtiesTags: nextTags }))}
                  helperText="Tape un tag puis Entrée. Supprime avec la croix au survol."
                  placeholder="React, UI / UX, Cloud"
                />
                <Stack direction="row" spacing={1}>
                  <Button type="submit" variant="contained" disabled={saving} sx={{ textTransform: 'none', fontWeight: 900 }}>
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </Stack>
              </Box>
            </Paper>
          )}

          <Box sx={{ mt: 3 }}>
            <Button component={RouterLink} to="/schools" variant="contained" sx={{ textTransform: 'none', fontWeight: 900 }}>
              Retour à la liste des écoles
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}