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
import * as companiesService from '../services/companiesService';
import { useStudents } from '../hooks/useStudents';
import { getCompanyProfile } from '../data/entityProfiles';

const initial = (name) => (name?.[0] || 'C').toUpperCase();

export default function CompanyProfile() {
  const { id } = useParams();
  const { students } = useStudents();
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [selectedSection, setSelectedSection] = useState('overview');
  const [editDraft, setEditDraft] = useState({ name: '', location: '', specialtiesTags: [] });
  const [editMessage, setEditMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    companiesService.getCompanies().then((items) => {
      if (mounted) {
        setCompany(items.find((item) => String(item.id) === String(id)) || items[0] || null);
      }
    });

    return () => {
      mounted = false;
    };
  }, [id]);

  const profile = getCompanyProfile(company);
  const linkedStudents = useMemo(
    () => students.filter((student) => String(student.company?.id) === String(company?.id)),
    [company, students]
  );

  const canEdit = Boolean(user && (user.role === 'admin' || String(user.profile?.companyId) === String(company?.id)));

  useEffect(() => {
    if (!company) return;

    setEditDraft({
      name: company.name || '',
      location: company.location || '',
      specialtiesTags: [...(profile.specialties || [])],
    });
  }, [company, profile.specialties]);

  const openLinkedStudents = () => {
    setSelectedSection('students');
  };

  if (!company) {
    return (
      <Container sx={{ py: 4 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>Chargement du profil entreprise...</Paper>
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
        location: editDraft.location || '',
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
          border: '1px solid #e4eaf1',
          boxShadow: '0 24px 60px rgba(17, 36, 59, 0.12)',
        }}
      >
        <Box sx={{ p: { xs: 3, md: 4 }, bgcolor: '#1f5f9d', color: '#fff' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={2.2} sx={{ alignItems: 'center' }}>
              <Avatar sx={{ width: 72, height: 72, bgcolor: '#f5c542', color: '#102339', fontWeight: 900, fontSize: 28 }}>
                {initial(company.name)}
              </Avatar>
              <Box>
                <Chip label="Entreprise" size="small" sx={{ bgcolor: '#fff', fontWeight: 900 }} />
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
                Collaborateurs répertoriés
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
                Une page profil pensée comme un mini LinkedIn: identité visuelle, repères métier et accès direct aux réseaux.
              </Typography>

              <Stack direction="row" gap={1} sx={{ mt: 2.5, flexWrap: 'wrap' }}>
                {profile.specialties.map((item) => (
                  <Chip key={item} label={item} sx={{ bgcolor: '#eef4fb', fontWeight: 800 }} icon={<BusinessCenterIcon />} />
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
                <Typography sx={{ fontWeight: 900 }}>Recrutement</Typography>
                <Typography variant="body2" sx={{ color: '#607287', mt: 0.5 }}>
                  Les offres ouvertes et les informations de contact peuvent être reliées aux profils étudiants et aux écoles partenaires.
                </Typography>
              </Box>
            </Paper>
          </Box>

          {selectedSection === 'students' && (
            <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3, border: '1px solid #e5ebf1' }}>
              <Typography variant="overline" sx={{ letterSpacing: 2, color: '#6d7c8f', fontWeight: 900 }}>
                Étudiants liés à {company.name}
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
                      {student.school?.id ? (
                        <Link component={RouterLink} to={`/schools/${student.school.id}`} underline="hover" sx={{ color: '#1f5f9d', fontWeight: 800 }}>
                          École: {student.school.name}
                        </Link>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#7a8794' }}>
                          École non renseignée
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ mt: 1.5, color: '#607287' }}>Aucun collaborateur n’est encore répertorié pour cette entreprise.</Typography>
              )}
            </Paper>
          )}

          {canEdit && (
            <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3, border: '1px solid #e5ebf1', bgcolor: '#fff' }}>
              <Typography variant="overline" sx={{ letterSpacing: 2, color: '#6d7c8f', fontWeight: 900 }}>
                Modifier ma fiche entreprise
              </Typography>
              <Typography sx={{ fontWeight: 900, mt: 0.5 }}>Contenu public et expertises</Typography>

              {editMessage && (
                <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: editMessage.type === 'success' ? '#ecfdf3' : '#fff5f5', color: editMessage.type === 'success' ? '#027a48' : '#b42318' }}>
                  <Typography sx={{ fontWeight: 800 }}>{editMessage.text}</Typography>
                </Box>
              )}

              <Box component="form" onSubmit={handleSave} sx={{ mt: 2, display: 'grid', gap: 1.5 }}>
                <TextField label="Nom" value={editDraft.name} onChange={(event) => setEditDraft((previous) => ({ ...previous, name: event.target.value }))} />
                <TextField label="Localisation" value={editDraft.location} onChange={(event) => setEditDraft((previous) => ({ ...previous, location: event.target.value }))} />
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