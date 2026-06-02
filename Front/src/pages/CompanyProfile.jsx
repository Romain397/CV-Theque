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
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import PublicIcon from '@mui/icons-material/Public';
import { useAuth } from '../auth';
import TagChipsInput from '../components/TagChipsInput';
import * as studentsService from '../services/studentsService';
import * as companiesService from '../services/companiesService';
import { useStudents } from '../hooks/useStudents';
import { getCompanyProfile } from '../data/entityProfiles';
import SmartSummaryBox from '../components/SmartSummaryBox';

const initial = (name) => (name?.[0] || 'C').toUpperCase();
const normalizeList = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => `${item || ''}`.trim())
    .filter(Boolean);
const getLocations = (company) => normalizeList(company?.locations?.length ? company.locations : [company?.location]);

export default function CompanyProfile() {
  const { id } = useParams();
  const { students, refresh: refreshStudents } = useStudents();
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [selectedSection, setSelectedSection] = useState('overview');
  const [editDraft, setEditDraft] = useState({ name: '', locationsTags: [], specialtiesTags: [] });
  const [editMessage, setEditMessage] = useState(null);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoadingCompany(true);
    companiesService.getCompanies()
      .then((items) => {
        if (mounted) {
          setCompany(items.find((item) => String(item.id) === String(id)) || null);
        }
      })
      .catch(() => {
        if (mounted) {
          setCompany(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingCompany(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const profile = useMemo(() => getCompanyProfile(company), [company]);
  const locations = getLocations(company);
  const linkedStudents = useMemo(
    () => students.filter((student) => String(student.company?.id) === String(company?.id)),
    [company, students]
  );
  const pendingStudents = useMemo(
    () => students.filter((student) => String(student.pendingCompanyId) === String(company?.id) && student.pendingCompanyStatus === 'pending'),
    [company, students]
  );
  const smartSummaryProfile = useMemo(() => ({
    type: 'company',
    name: company?.name || '',
    location: company?.locations?.length ? company.locations.join(', ') : (company?.location || ''),
    summary: profile.summary,
    tagline: profile.tagline,
    specialties: profile.specialties || [],
    highlights: profile.highlights || [],
    metrics: (profile.metrics || []).map((metric) => `${metric.label}: ${metric.value}`),
    linkedStudentsCount: linkedStudents.length,
    website: profile.website,
  }), [company, linkedStudents.length, profile]);

  const companyIdentity = user?.profile?.companyId || user?.profile?.company?.id || user?.id;
  const canEdit = Boolean(user && (user.role === 'admin' || String(companyIdentity) === String(company?.id)));
  const canModeratePending = Boolean(user && (user.role === 'admin' || String(user.id) === String(company?.id)));

  useEffect(() => {
    if (!company) return;

    setEditDraft({
      name: company.name || '',
      locationsTags: normalizeList(company.locations?.length ? company.locations : [company.location]),
      specialtiesTags: [...(profile.specialties || [])],
    });
  }, [company, profile.specialties]);

  const openLinkedStudents = () => {
    setSelectedSection('students');
  };

  const handlePendingCompany = async (studentId, action) => {
    if (!studentId) return;
    setSaving(true);
    setPendingMessage(null);

    try {
      await studentsService.respondPendingCompany(studentId, action);
      await refreshStudents?.();
      setPendingMessage({ type: 'success', text: 'Demande mise à jour.' });
    } catch (error) {
      setPendingMessage({ type: 'error', text: error?.message || 'Impossible de traiter la demande.' });
    } finally {
      setSaving(false);
    }
  };

  if (loadingCompany) {
    return (
      <Container sx={{ py: 4 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          Chargement du profil entreprise...
        </Paper>
      </Container>
    );
  }

  if (!company) {
    return (
      <Container sx={{ py: 4 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography sx={{ fontWeight: 900, mb: 1 }}>Entreprise introuvable.</Typography>
          <Button component={RouterLink} to="/companies" variant="contained" sx={{ textTransform: 'none', fontWeight: 900 }}>
            Voir les entreprises
          </Button>
        </Paper>
      </Container>
    );
  }

  const splitTags = (value = []) => Array.from(new Set((value || []).map((item) => String(item).trim()).filter(Boolean)));

  const handleSave = async (event) => {
    event.preventDefault();
    if (!canEdit || !company) return;

    setSaving(true);
    setEditMessage(null);

    try {
      const updatedCompany = await companiesService.updateCompany(company.id, {
        name: editDraft.name || company.name,
        location: (editDraft.locationsTags || [])[0] || '',
        locations: normalizeList(editDraft.locationsTags || []),
        specialties: splitTags(editDraft.specialtiesTags || []),
      });

      setCompany(updatedCompany);
      setEditMessage({ type: 'success', text: 'Fiche entreprise enregistrée.' });
    } catch (error) {
      setEditMessage({ type: 'error', text: error?.message || 'Impossible de sauvegarder la fiche entreprise.' });
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
                {initial(company.name)}
              </Avatar>
              <Box>
                <Chip label="Entreprise" size="small" sx={{ bgcolor: 'background.paper', fontWeight: 900 }} />
                <Typography variant="h4" sx={{ fontWeight: 950, mt: 1 }}>
                  {company.name}
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
                Collaborateurs répertoriés
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
              <Typography variant="h5" sx={{ fontWeight: 950, mt: 1 }}>
                {profile.summary}
              </Typography>
              <Typography sx={{ color: 'var(--text-secondary)', mt: 1.5 }}>
                Une page profil pensée comme un mini LinkedIn: identité visuelle, repères métier et accès direct aux réseaux.
              </Typography>

              <Stack direction="row" gap={1} sx={{ mt: 2.5, flexWrap: 'wrap' }}>
                {profile.specialties.map((item) => (
                  <Chip key={item} label={item} sx={{ bgcolor: 'var(--muted-bg)', fontWeight: 800 }} icon={<BusinessCenterIcon />} />
                ))}
              </Stack>

              <Box sx={{ mt: 3 }}>
                {profile.highlights.map((item) => (
                  <Paper key={item} elevation={0} sx={{ p: 1.6, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', mb: 1.2 }}>
                    <Typography sx={{ fontWeight: 700 }}>{item}</Typography>
                  </Paper>
                ))}
              </Box>

              <SmartSummaryBox
                type="company"
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
                        {index === 0 ? 'Adresse principale' : `Site ${index + 1}`}
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
                <Typography sx={{ fontWeight: 900 }}>Recrutement</Typography>
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>
                  Les offres ouvertes et les informations de contact peuvent être reliées aux profils étudiants et aux écoles partenaires.
                </Typography>
              </Box>
            </Paper>
          </Box>

          {selectedSection === 'students' && (
            <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Typography variant="overline" sx={{ letterSpacing: 2, color: 'var(--text-secondary)', fontWeight: 900 }}>
                Étudiants liés à {company.name}
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
                      {student.school?.id ? (
                        <Link component={RouterLink} to={`/schools/${student.school.id}`} underline="hover" sx={{ color: 'var(--accent)', fontWeight: 800 }}>
                          École: {student.school.name}
                        </Link>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                          École non renseignée
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ mt: 1.5, color: 'var(--text-secondary)' }}>Aucun collaborateur n’est encore répertorié pour cette entreprise.</Typography>
              )}
            </Paper>
          )}

          {canModeratePending && (
            <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } }}>
                <Box>
                  <Typography variant="overline" sx={{ letterSpacing: 2, color: 'var(--text-secondary)', fontWeight: 900 }}>
                    Demandes en attente
                  </Typography>
                  <Typography sx={{ fontWeight: 900, mt: 0.3 }}>
                    Candidatures à valider pour {company.name}
                  </Typography>
                </Box>
                <Button variant="outlined" onClick={openLinkedStudents} sx={{ textTransform: 'none', fontWeight: 800 }}>
                  Voir les étudiants liés
                </Button>
              </Stack>

              {pendingMessage && (
                <Box sx={{ mt: 1.5, p: 1.3, borderRadius: 2, bgcolor: pendingMessage.type === 'success' ? 'rgba(16,185,129,.12)' : 'rgba(180,35,24,.08)', color: pendingMessage.type === 'success' ? 'var(--success, #027a48)' : 'var(--error, #b42318)' }}>
                  <Typography sx={{ fontWeight: 800 }}>{pendingMessage.text}</Typography>
                </Box>
              )}

              <Box sx={{ mt: 2, display: 'grid', gap: 1.2 }}>
                {pendingStudents.length ? (
                  pendingStudents.map((student) => (
                    <Paper key={student.id} elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'var(--surface-soft)', border: '1px solid', borderColor: 'divider' }}>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } }}>
                        <Box>
                          <Typography sx={{ fontWeight: 900 }}>
                            {student.firstName} {student.lastName}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                            {student.jobTitle || 'Profil étudiant'} - {student.location || 'Localisation non renseignée'}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>
                            Tags: {(student.tags || []).map((tag) => (typeof tag === 'string' ? tag : tag?.name)).filter(Boolean).join(', ') || 'Aucun'}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Button variant="contained" color="success" disabled={saving} onClick={() => handlePendingCompany(student.id, 'approve')}>
                            Approuver
                          </Button>
                          <Button variant="outlined" color="error" disabled={saving} onClick={() => handlePendingCompany(student.id, 'reject')}>
                            Refuser
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))
                ) : (
                  <Typography sx={{ color: 'var(--text-secondary)' }}>
                    Aucune demande d’entreprise en attente pour le moment.
                  </Typography>
                )}
              </Box>
            </Paper>
          )}

          {canEdit && (
            <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Typography variant="overline" sx={{ letterSpacing: 2, color: 'var(--text-secondary)', fontWeight: 900 }}>
                Modifier ma fiche entreprise
              </Typography>
              <Typography sx={{ fontWeight: 900, mt: 0.5 }}>Contenu public et expertises</Typography>

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
                  placeholder="Paris, Nantes, Remote"
                />
                <TagChipsInput
                  label="Expertises / tags"
                  tags={editDraft.specialtiesTags || []}
                  onChange={(nextTags) => setEditDraft((previous) => ({ ...previous, specialtiesTags: nextTags }))}
                  helperText="Tape un tag puis Entrée. Supprime avec la croix au survol."
                  placeholder="React, API, Delivery"
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
            <Button component={RouterLink} to="/companies" variant="contained" sx={{ textTransform: 'none', fontWeight: 900 }}>
              Retour à la liste des entreprises
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
