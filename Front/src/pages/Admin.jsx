import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, loadUsers, saveUsers, getAuthStats, syncUsersFromServer } from '../auth';
import * as studentsService from '../services/studentsService';
import { useToast } from '../components/ToastProvider';
import {
  Avatar,
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

const roleLabel = (role) => {
  if (role === 'student') return 'Étudiant';
  if (role === 'school') return 'École';
  if (role === 'company') return 'Entreprise';
  if (role === 'admin') return 'Administrateur';
  return role;
};

const statusLabel = (approved) => (approved ? 'Actif' : 'En attente');

export default function Admin() {
  const { user, logout, loadUsers: refreshAuthUsers } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [role, setRole] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState(null);

  const syncUsers = () => {
    const nextUsers = loadUsers();
    setUsers(nextUsers);
    return nextUsers;
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      // try to sync from server first, fallback to local storage
      (async () => {
        const remote = await syncUsersFromServer();
        if (remote && Array.isArray(remote) && remote.length) {
          setUsers(remote);
        } else {
          syncUsers();
        }
      })();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  // Pagination / page size control
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return users.filter((candidate) => {
      const matchesSearch =
        !normalizedSearch ||
        [candidate.name, candidate.email, candidate.role]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      const matchesStatus =
        status === 'all' || (status === 'active' ? candidate.approved : !candidate.approved);
      const matchesRole = role === 'all' || candidate.role === role;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [role, search, status, users]);

  const selectedUser = filteredUsers.find((candidate) => candidate.id === selectedUserId) || filteredUsers[0] || null;
  const stats = getAuthStats();

  // compute paged results
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(filteredUsers.length / pageSize)) : 1;
  const pagedUsers = pageSize > 0 ? filteredUsers.slice((page - 1) * pageSize, page * pageSize) : filteredUsers;

  const persistUsers = (nextUsers) => {
    saveUsers(nextUsers);
    setUsers(nextUsers);
    refreshAuthUsers?.();
  };

  const handleApprove = (id, approved) => {
    (async () => {
      try {
        setLoading(true);
        // call backend to set approved flag
        await studentsService.setUserApproved(id, approved);
        const remote = await syncUsersFromServer();
        if (remote) setUsers(remote);
        toast.showToast(approved ? 'Compte validé' : 'Compte désactivé', { severity: 'success' });
      } catch (e) {
        // fallback to local change
        const nextUsers = loadUsers().map((candidate) =>
          candidate.id === id
            ? {
                ...candidate,
                approved,
                approvedAt: approved ? new Date().toISOString() : null,
                approvedBy: approved ? user.name : candidate.approvedBy,
              }
            : candidate
        );
        persistUsers(nextUsers);
        toast.showToast('Action appliquée en local (API indisponible)', { severity: 'warning' });
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleRoleChange = (id, nextRole) => {
    const nextUsers = loadUsers().map((candidate) =>
      candidate.id === id
        ? {
            ...candidate,
            role: nextRole,
            approved: nextRole === 'admin' ? true : candidate.approved,
            approvedAt: nextRole === 'admin' ? new Date().toISOString() : candidate.approvedAt,
            approvedBy: nextRole === 'admin' ? user.name : candidate.approvedBy,
          }
        : candidate
    );

    persistUsers(nextUsers);
  };

  const handleDelete = (id) => {
    if (!window.confirm('Confirmer suppression du compte ?')) return;
    (async () => {
      try {
        setLoading(true);
        await studentsService.deleteStudent(id);
        const remote = await syncUsersFromServer();
        if (remote) setUsers(remote);
        if (selectedUserId === id) setSelectedUserId(null);
        if (user?.id === id) { logout(); navigate('/login'); }
        toast.showToast('Compte supprimé', { severity: 'success' });
      } catch (e) {
        // fallback: local removal
        const nextUsers = loadUsers().filter((candidate) => candidate.id !== id);
        persistUsers(nextUsers);
        if (selectedUserId === id) setSelectedUserId(null);
        if (user?.id === id) { logout(); navigate('/login'); }
        toast.showToast('Suppression appliquée en local (API indisponible)', { severity: 'warning' });
      } finally { setLoading(false); }
    })();
  };

  if (!user) return null;

  return (
    <Container sx={{ py: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 4,
          border: '1px solid #e4eaf1',
          boxShadow: '0 24px 60px rgba(17, 36, 59, 0.1)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } }}>
          <Box>
            <Chip label="Console admin" sx={{ mb: 1, fontWeight: 900 }} />
            <Typography variant="h4" sx={{ fontWeight: 950 }}>
              Administration globale
            </Typography>
            <Typography variant="body2" sx={{ color: '#607287', maxWidth: 760, mt: 0.8 }}>
              Validez les nouveaux comptes, ajustez les rôles, consultez les profils et gardez une vision claire des utilisateurs de la plateforme.
            </Typography>
          </Box>
          <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Typography variant="caption">Connecté en tant que {user.name} ({roleLabel(user.role)})</Typography>
            <Box sx={{ mt: 1 }}>
              <Button variant="outlined" onClick={() => navigate('/')}>Voir le site</Button>
            </Box>
          </Box>
        </Stack>

        <Divider sx={{ my: 2.5 }} />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 1.4 }}>
          {[
            ['Total', stats.total],
            ['Actifs', stats.approved],
            ['En attente', stats.pending],
            ['Étudiants', stats.students],
            ['Écoles / Entreprises', `${stats.schools} / ${stats.companies}`],
          ].map(([label, value]) => (
            <Paper key={label} elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: '#f7f8fa', border: '1px solid #edf1f5' }}>
              <Typography variant="overline" sx={{ color: '#7b8794', letterSpacing: 2, fontWeight: 900 }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: 28, lineHeight: 1, fontWeight: 950, color: '#102339', mt: 0.5 }}>
                {value}
              </Typography>
            </Paper>
          ))}
        </Box>

        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, mt: 2, border: '1px solid #e5ebf1' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' } }}>
            <Box>
              <Typography variant="overline" sx={{ color: '#7b8794', letterSpacing: 2, fontWeight: 900 }}>
                Recherche et tri
              </Typography>
              <Typography sx={{ fontSize: 20, fontWeight: 900 }}>{filteredUsers.length} comptes visibles</Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, minWidth: { md: 520 } }}>
              <TextField
                size="small"
                fullWidth
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un nom, email ou rôle"
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Statut</InputLabel>
                <Select label="Statut" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <MenuItem value="all">Tous</MenuItem>
                  <MenuItem value="active">Actifs</MenuItem>
                  <MenuItem value="pending">En attente</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <InputLabel>Rôle</InputLabel>
                <Select label="Rôle" value={role} onChange={(e) => setRole(e.target.value)}>
                  <MenuItem value="all">Tous</MenuItem>
                  <MenuItem value="student">Étudiant</MenuItem>
                  <MenuItem value="school">École</MenuItem>
                  <MenuItem value="company">Entreprise</MenuItem>
                  <MenuItem value="admin">Administrateur</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </Paper>

        {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}

        <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr 0.8fr' }, gap: 2 }}>
          <Box>
            {loading ? (
              <Typography>Chargement...</Typography>
            ) : filteredUsers.length ? (
              pagedUsers.map((candidate) => (
                <Paper
                  key={candidate.id}
                  elevation={0}
                  sx={{
                    p: 2.2,
                    mb: 1.4,
                    borderRadius: 3,
                    border: selectedUser?.id === candidate.id ? '1px solid #1f5f9d' : '1px solid #e7edf4',
                    boxShadow: selectedUser?.id === candidate.id ? '0 14px 34px rgba(29, 78, 124, 0.12)' : '0 10px 28px rgba(17, 36, 59, 0.06)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedUserId(candidate.id)}
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}>
                    <Stack direction="row" spacing={1.6} sx={{ alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: '#dceaf7', color: '#214a71', fontWeight: 900 }}>
                        {(candidate.name?.[0] || candidate.email?.[0] || '?').toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontWeight: 900 }}>{candidate.name}</Typography>
                        <Typography variant="body2" sx={{ color: '#607287' }}>{candidate.email}</Typography>
                        <Typography variant="caption" sx={{ color: '#7a8794' }}>{roleLabel(candidate.role)}</Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                      <Chip label={statusLabel(candidate.approved)} size="small" sx={{ fontWeight: 800, bgcolor: candidate.approved ? '#e7f7ee' : '#fff4db', color: candidate.approved ? '#0f7a3f' : '#9a6700' }} />
                      <Button size="small" variant="outlined" onClick={(event) => { event.stopPropagation(); handleApprove(candidate.id, !candidate.approved); }}>
                        {candidate.approved ? 'Désactiver' : 'Valider'}
                      </Button>
                      <FormControl size="small" sx={{ minWidth: 160 }}>
                        <Select
                          value={candidate.role}
                          onChange={(event) => handleRoleChange(candidate.id, event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MenuItem value="student">Étudiant</MenuItem>
                          <MenuItem value="school">École</MenuItem>
                          <MenuItem value="company">Entreprise</MenuItem>
                          <MenuItem value="admin">Administrateur</MenuItem>
                        </Select>
                      </FormControl>
                      <Button color="error" variant="text" onClick={(event) => { event.stopPropagation(); handleDelete(candidate.id); }}>
                        Supprimer
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))
            ) : (
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px dashed #cbd5df' }}>
                <Typography sx={{ fontWeight: 900 }}>Aucun compte ne correspond aux filtres.</Typography>
              </Paper>
            )}
            {/* pagination controls */}
            <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Afficher</InputLabel>
                <Select size="small" label="Afficher" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  <MenuItem value={10}>10 / page</MenuItem>
                  <MenuItem value={25}>25 / page</MenuItem>
                  <MenuItem value={50}>50 / page</MenuItem>
                  <MenuItem value={0}>Tous</MenuItem>
                </Select>
              </FormControl>
              {pageSize > 0 && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Préc.</Button>
                  <Typography sx={{ minWidth: 60, textAlign: 'center' }}>Page {page} / {totalPages}</Typography>
                  <Button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Suiv.</Button>
                </Box>
              )}
            </Box>
          </Box>

          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e5ebf1', height: 'fit-content', position: { lg: 'sticky' }, top: 20 }}>
            <Typography variant="overline" sx={{ letterSpacing: 2, color: '#7b8794', fontWeight: 900 }}>
              Détails du compte
            </Typography>
            {selectedUser ? (
              <Box sx={{ mt: 1.5 }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: '#dceaf7', color: '#214a71', fontWeight: 900 }}>
                    {(selectedUser.name?.[0] || selectedUser.email?.[0] || '?').toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 950 }}>{selectedUser.name}</Typography>
                    <Typography variant="body2" sx={{ color: '#607287' }}>{selectedUser.email}</Typography>
                  </Box>
                </Stack>

                <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  {[
                    ['Rôle', roleLabel(selectedUser.role)],
                    ['Statut', statusLabel(selectedUser.approved)],
                    ['Créé', selectedUser.approvedAt ? new Date(selectedUser.approvedAt).toLocaleString('fr-FR') : '—'],
                    ['Validé par', selectedUser.approvedBy || '—'],
                  ].map(([label, value]) => (
                    <Paper key={label} elevation={0} sx={{ p: 1.4, borderRadius: 2, bgcolor: '#f7f8fa', border: '1px solid #edf1f5' }}>
                      <Typography variant="overline" sx={{ color: '#7b8794', fontWeight: 900, letterSpacing: 1.2 }}>{label}</Typography>
                      <Typography sx={{ fontWeight: 800, color: '#102339', wordBreak: 'break-word' }}>{value}</Typography>
                    </Paper>
                  ))}
                </Box>

                <Typography variant="body2" sx={{ color: '#607287', mt: 2 }}>
                  Cette vue peut servir de base pour gérer plus tard les écoles, les entreprises et les étudiants avec les mêmes mécaniques d’approbation et de modification.
                </Typography>
                {selectedUser?.profile?.pendingSchoolId && (
                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ fontWeight: 900 }}>Demande d'école</Typography>
                    <Typography variant="body2">École demandée: {selectedUser.profile.pendingSchoolId} — statut: {selectedUser.profile.pendingSchoolStatus || 'pending'}</Typography>
                    {(user.role === 'admin' || (user.role === 'school' && String(user.id) === String(selectedUser.profile.pendingSchoolId))) && (
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Button variant="contained" color="success" onClick={async () => {
                          try {
                            await studentsService.respondPendingSchool(selectedUser.id, 'approve');
                            const remote = await syncUsersFromServer();
                            if (remote) setUsers(remote);
                          } catch (e) { console.error(e); }
                        }}>Approuver</Button>
                        <Button variant="outlined" color="error" onClick={async () => {
                          try {
                            await studentsService.respondPendingSchool(selectedUser.id, 'reject');
                            const remote = await syncUsersFromServer();
                            if (remote) setUsers(remote);
                          } catch (e) { console.error(e); }
                        }}>Refuser</Button>
                      </Stack>
                    )}
                  </Box>
                )}
                {selectedUser?.profile?.pendingCompanyId && (
                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ fontWeight: 900 }}>Demande d'entreprise</Typography>
                    <Typography variant="body2">Entreprise demandée: {selectedUser.profile.pendingCompanyId} — statut: {selectedUser.profile.pendingCompanyStatus || 'pending'}</Typography>
                    {(user.role === 'admin' || (user.role === 'company' && String(user.id) === String(selectedUser.profile.pendingCompanyId))) && (
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Button variant="contained" color="success" onClick={async () => {
                          try {
                            await studentsService.respondPendingCompany(selectedUser.id, 'approve');
                            const remote = await syncUsersFromServer();
                            if (remote) setUsers(remote);
                          } catch (e) { console.error(e); }
                        }}>Approuver</Button>
                        <Button variant="outlined" color="error" onClick={async () => {
                          try {
                            await studentsService.respondPendingCompany(selectedUser.id, 'reject');
                            const remote = await syncUsersFromServer();
                            if (remote) setUsers(remote);
                          } catch (e) { console.error(e); }
                        }}>Refuser</Button>
                      </Stack>
                    )}
                  </Box>
                )}
              </Box>
            ) : (
              <Typography sx={{ color: '#607287', mt: 1.5 }}>Sélectionne un compte pour voir son détail.</Typography>
            )}
          </Paper>
        </Box>
      </Paper>
    </Container>
  );
}
