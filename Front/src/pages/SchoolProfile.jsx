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
import SmartSummaryBox from '../components/SmartSummaryBox';

const initial = (name) => (name?.[0] || 'S').toUpperCase();
const normalizeList = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => `${item || ''}`.trim())
    .filter(Boolean);
const getLocations = (school) => normalizeList(school?.locations?.length ? school.locations : [school?.location]);

export default function SchoolProfile() {
  const { id } = useParams();
  const { students } = useStudents();
  const { user } = useAuth();
  const [school, setSchool] = useState(null);
  const [loadingSchool, setLoadingSchool] = useState(true);
  const [selectedSection, setSelectedSection] = useState('overview');
  const [editDraft, setEditDraft] = useState({ name: '', locationsTags: [], specialtiesTags: [] });
  const [editMessage, setEditMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoadingSchool(true);
    schoolsService.getSchools()
      .then((items) => {
        if (mounted) {
          setSchool(items.find((item) => String(item.id) === String(id)) || null);
        }
      })
      .catch(() => {
        if (mounted) {
          setSchool(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingSchool(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const profile = useMemo(() => getSchoolProfile(school), [school]);
  const locations = getLocations(school);
  const linkedStudents = useMemo(
    () => students.filter((student) => String(student.school?.id) === String(school?.id)),
    [school, students]
  );
  const smartSummaryProfile = useMemo(() => ({
    type: 'school',
    name: school?.name || '',
    location: school?.locations?.length ? school.locations.join(', ') : (school?.location || ''),
    summary: profile.summary,
    tagline: profile.tagline,
    specialties: profile.specialties || [],
    highlights: profile.highlights || [],
    metrics: (profile.metrics || []).map((metric) => `${metric.label}: ${metric.value}`),
    linkedStudentsCount: linkedStudents.length,
    website: profile.website,
  }), [linkedStudents.length, profile, school]);

  const canEdit = Boolean(user && (user.role === 'admin' || String(user.profile?.schoolId) === String(school?.id)));

  useEffect(() => {
    if (!school) return;

    setEditDraft({
      name: school.name || '',
      locationsTags: normalizeList(school.locations?.length ? school.locations : [school.location]),
      headline: school.headline || '',
      bio: school.bio || '',
      website: school.website || '',
      highlightsText: normalizeList(profile.highlights || []).join('\n'),
      campusPerksText: normalizeList(profile.campusPerks || []).slice(0, 4).join('\n'),
      specialtiesTags: [...(profile.specialties || [])],
    });
  }, [profile.campusPerks, profile.highlights, profile.specialties, school]);

  const openLinkedStudents = () => {
    setSelectedSection('students');
  };

  if (loadingSchool) {
    return (
      <Container sx={{ py: 4 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          Chargement du profil école...
        </Paper>
      </Container>
    );
  }

  if (!school) {
    return (
      <Container sx={{ py: 4 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography sx={{ fontWeight: 900, mb: 1 }}>École introuvable.</Typography>
          <Button component={RouterLink} to="/schools" variant="contained" sx={{ textTransform: 'none', fontWeight: 900 }}>
            Voir les écoles
          </Button>
        </Paper>
      </Container>
    );
  }

  const splitTags = (value = []) => Array.from(new Set((value || []).map((item) => String(item).trim()).filter(Boolean)));

  const handleSave = async (event) => {
    event.preventDefault();
    if (!canEdit || !school) return;

    setSaving(true);
    setEditMessage(null);

    try {
      const updatedSchool = await schoolsService.updateSchool(school.id, {
        name: editDraft.name || school.name,
        location: (editDraft.locationsTags || [])[0] || '',
        locations: normalizeList(editDraft.locationsTags || []),
        headline: editDraft.headline || '',
        bio: editDraft.bio || '',
        website: editDraft.website || '',
        specialties: splitTags(editDraft.specialtiesTags || []),
        highlights: normalizeList((editDraft.highlightsText || '').split('\n')),
        campusPerks: normalizeList((editDraft.campusPerksText || '').split('\n')).slice(0, 4),
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
          border: '1px solid var(--border-color)',
          boxShadow: '0 24px 60px rgba(17, 36, 59, 0.12)',
        }}
      >
        <Box sx={{ p: { xs: 3, md: 4 }, bgcolor: 'var(--accent-strong)', color: '#fff' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={2.2} sx={{ alignItems: 'center' }}>
              <Avatar sx={{ width: 72, height: 72, bgcolor: '#f5c542', color: 'var(--text-primary)', fontWeight: 900, fontSize: 28 }}>
                {initial(school.name)}
              </Avatar>
              <Box>
                <Chip label="École" size="small" sx={{ bgcolor: 'background.paper', fontWeight: 900 }} />
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

        <Box sx={{ p: { xs: 3, md: 4 }, bgcolor: 'var(--page-bg)' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {profile.metrics.map((metric) => (
              <Paper key={metric.label} elevation={0} sx={{ flex: 1, p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Typography variant="overline" sx={{ letterSpacing: 2, color: 'var(--text-secondary)', fontWeight: 900 }}>
                  {metric.label}
                </Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 950, color: 'var(--text-primary)' }}>
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
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                bgcolor: selectedSection === 'students' ? 'var(--accent-soft)' : 'var(--surface-bg)',
                transition: 'transform .2s ease, box-shadow .2s ease',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 28px rgba(17, 36, 59, 0.08)' },
              }}
            >
              <Typography variant="overline" sx={{ letterSpacing: 2, color: 'var(--text-secondary)', fontWeight: 900 }}>
                Étudiants répertoriés
              </Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 950, color: 'var(--text-primary)' }}>
                {linkedStudents.length}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                Cliquez pour voir la liste
              </Typography>
            </Paper>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2.5, mt: 3 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Typography variant="overline" sx={{ letterSpacing: 2, color: 'var(--text-secondary)', fontWeight: 900 }}>
                À propos
              </Typography>
              {profile.summary && (
                <Typography variant="h5" sx={{ fontWeight: 950, mt: 1 }}>
                  {profile.summary}
                </Typography>
              )}
              {profile.bio && (
                <Typography sx={{ color: 'var(--text-secondary)', mt: 1.5 }}>
                  {profile.bio}
                </Typography>
              )}

              <Stack direction="row" gap={1} sx={{ mt: 2.5, flexWrap: 'wrap' }}>
                {profile.specialties.length ? (
                  profile.specialties.map((item) => (
                    <Chip key={item} label={item} sx={{ bgcolor: 'var(--muted-bg)', fontWeight: 800 }} icon={<SchoolIcon />} />
                  ))
                ) : (
                  <Chip label="Non renseigné" sx={{ bgcolor: 'var(--muted-bg)', fontWeight: 800 }} />
                )}
              </Stack>

              <Box sx={{ mt: 3 }}>
                {profile.highlights.length ? (
                  profile.highlights.map((item) => (
                    <Paper key={item} elevation={0} sx={{ p: 1.6, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', mb: 1.2 }}>
                      <Typography sx={{ fontWeight: 700 }}>{item}</Typography>
                    </Paper>
                  ))
                ) : (
                  <Paper elevation={0} sx={{ p: 1.6, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', mb: 1.2 }}>
                    <Typography sx={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Non renseigné</Typography>
                  </Paper>
                )}
              </Box>

              <SmartSummaryBox
                type="school"
                profile={smartSummaryProfile}
                title="Résumé intelligent du profil"
                description="Génère une version courte pour les cartes, aperçus et listes."
              />
            </Paper>

            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Typography variant="overline" sx={{ letterSpacing: 2, color: 'var(--text-secondary)', fontWeight: 900 }}>
                Localisations
              </Typography>
              <Stack spacing={1} sx={{ mt: 2, mb: 3 }}>
                {locations.length ? (
                  locations.map((location, index) => (
                    <Paper key={location} elevation={0} sx={{ p: 1.4, borderRadius: 2, bgcolor: 'var(--surface-soft)', border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 900 }}>
                        {index === 0 ? 'Adresse principale' : `Campus ${index + 1}`}
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>{location}</Typography>
                    </Paper>
                  ))
                ) : (
                  <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                    Non renseigné
                  </Typography>
                )}
              </Stack>

              <Typography variant="overline" sx={{ letterSpacing: 2, color: 'var(--text-secondary)', fontWeight: 900 }}>
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

              <Box sx={{ mt: 3, p: 2, borderRadius: 3, bgcolor: 'var(--muted-bg)' }}>
                <Typography variant="overline" sx={{ letterSpacing: 2, color: 'var(--text-secondary)', fontWeight: 900 }}>
                  {profile.campusPerks.length > 1 ? "Points forts de l'école" : "Point fort de l'école"}
                </Typography>
                <Stack spacing={1} sx={{ mt: 1.2 }}>
                  {profile.campusPerks.length ? (
                    profile.campusPerks.slice(0, 4).map((perk) => (
                      <Paper key={perk} elevation={0} sx={{ p: 1.4, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {perk}
                        </Typography>
                      </Paper>
                    ))
                  ) : (
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                      Non renseigné
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Paper>
          </Box>

          {selectedSection === 'students' && (
            <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Typography variant="overline" sx={{ letterSpacing: 2, color: 'var(--text-secondary)', fontWeight: 900 }}>
                Étudiants liés à {school.name}
              </Typography>
              {linkedStudents.length ? (
                <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.2 }}>
                  {linkedStudents.map((student) => (
                    <Paper key={student.id} elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                      <Typography sx={{ fontWeight: 900 }}>
                        {student.firstName} {student.lastName}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                        {student.jobTitle} - {student.location}
                      </Typography>
                      {student.company?.id ? (
                        <Link component={RouterLink} to={`/companies/${student.company.id}`} underline="hover" sx={{ color: 'var(--accent)', fontWeight: 800 }}>
                          Entreprise: {student.company.name}
                        </Link>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                          Entreprise non renseignée
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ mt: 1.5, color: 'var(--text-secondary)' }}>Aucun étudiant n’est encore répertorié pour cette école.</Typography>
              )}
            </Paper>
          )}

          {canEdit && (
            <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Typography variant="overline" sx={{ letterSpacing: 2, color: 'var(--text-secondary)', fontWeight: 900 }}>
                Modifier ma fiche école
              </Typography>
              <Typography sx={{ fontWeight: 900, mt: 0.5 }}>Contenu public et spécialités</Typography>

              {editMessage && (
                <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: editMessage.type === 'success' ? 'rgba(16,185,129,.12)' : 'rgba(180,35,24,.08)', color: editMessage.type === 'success' ? 'var(--success, #027a48)' : 'var(--error, #b42318)' }}>
                  <Typography sx={{ fontWeight: 800 }}>{editMessage.text}</Typography>
                </Box>
              )}

              <Box component="form" onSubmit={handleSave} sx={{ mt: 2, display: 'grid', gap: 1.5 }}>
                <TextField label="Nom" value={editDraft.name} onChange={(event) => setEditDraft((previous) => ({ ...previous, name: event.target.value }))} />
                <TagChipsInput
                  label="Localisations"
                  tags={editDraft.locationsTags || []}
                  onChange={(nextLocations) => setEditDraft((previous) => ({ ...previous, locationsTags: nextLocations }))}
                  helperText="Tape une ville ou adresse puis Entrée. La première localisation sera utilisée comme localisation principale."
                  placeholder="Versailles, Paris, Lyon"
                />
                <TextField
                  label="Accroche"
                  value={editDraft.headline || ''}
                  onChange={(event) => setEditDraft((previous) => ({ ...previous, headline: event.target.value }))}
                />
                <TextField
                  label="Bio"
                  value={editDraft.bio || ''}
                  onChange={(event) => setEditDraft((previous) => ({ ...previous, bio: event.target.value }))}
                  multiline
                  minRows={3}
                />
                <TextField
                  label="Site web"
                  value={editDraft.website || ''}
                  onChange={(event) => setEditDraft((previous) => ({ ...previous, website: event.target.value }))}
                />
                <TagChipsInput
                  label="Spécialités"
                  tags={editDraft.specialtiesTags || []}
                  onChange={(nextTags) => setEditDraft((previous) => ({ ...previous, specialtiesTags: nextTags }))}
                  helperText="Tape un tag puis Entrée. Supprime avec la croix au survol."
                  placeholder="React, UI / UX, Cloud"
                />
                <TextField
                  label="Éléments clés"
                  value={editDraft.highlightsText || ''}
                  onChange={(event) => setEditDraft((previous) => ({ ...previous, highlightsText: event.target.value }))}
                  helperText="Un élément par ligne."
                  multiline
                  minRows={3}
                />
                <TextField
                  label="Points forts de l'école"
                  value={editDraft.campusPerksText || ''}
                  onChange={(event) => setEditDraft((previous) => ({ ...previous, campusPerksText: event.target.value }))}
                  helperText="Un point fort par ligne. Les 4 premiers seront affichés."
                  multiline
                  minRows={3}
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
