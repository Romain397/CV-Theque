import React, { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import { useAuth } from '../auth';
import { useStudents } from '../hooks/useStudents';
import * as studentsService from '../services/studentsService';
import * as companiesService from '../services/companiesService';

const initial = (name) => (name?.[0] || 'C').toUpperCase();

export default function CompanyRequests() {
  const { user } = useAuth();
  const { students, refresh: refreshStudents } = useStudents();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [companies, setCompanies] = useState([]);

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

  const pendingStudents = useMemo(
    () => students.filter((student) => String(student.pendingCompanyId) === String(companyId) && student.pendingCompanyStatus === 'pending'),
    [companyId, students]
  );

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
    </Container>
  );
}
