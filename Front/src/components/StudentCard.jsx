import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

const initials = (student) =>
  `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase() || 'PR';

const visibleSkills = (skills = []) => skills.slice(0, 3);

export const StudentCard = ({ student, selected, onSelect, onEdit, onDelete }) => {
  return (
    <Paper
      component="article"
      elevation={0}
      onClick={() => onSelect(student)}
      sx={{
        p: 2.2,
        borderRadius: 2,
        border: selected ? '1px solid #1f5f9d' : '1px solid #e7edf4',
        bgcolor: '#fff',
        boxShadow: selected
          ? '0 14px 34px rgba(29, 78, 124, 0.16)'
          : '0 10px 28px rgba(17, 36, 59, 0.08)',
        cursor: 'pointer',
        transition: 'border-color .2s ease, transform .2s ease, box-shadow .2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 16px 36px rgba(17, 36, 59, 0.12)',
        },
      }}
    >
      <Stack direction="row" spacing={1.6} alignItems="flex-start">
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: '#dceaf7',
            color: '#214a71',
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {initials(student)}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.3 }}>
            <Typography variant="caption" sx={{ color: '#45627d', fontWeight: 800 }}>
              {student.location || 'Localisation'}
            </Typography>
            <Chip
              label="En vue"
              size="small"
              sx={{
                height: 18,
                borderRadius: 99,
                bgcolor: '#ffbf18',
                color: '#102339',
                fontSize: 10,
                fontWeight: 900,
              }}
            />
          </Stack>

          <Typography sx={{ color: '#0f263d', fontWeight: 800, lineHeight: 1.1 }}>
            {student.firstName} {student.lastName}
          </Typography>
          <Typography variant="body2" sx={{ color: '#607287', mt: 0.2 }}>
            {student.jobTitle || 'Profil étudiant'}
          </Typography>
        </Box>
      </Stack>

      <Chip
        label="Disponible immédiatement"
        size="small"
        sx={{
          mt: 1.8,
          height: 21,
          borderRadius: 1,
          bgcolor: '#e9f3fb',
          color: '#2d6697',
          fontSize: 10,
          fontWeight: 800,
        }}
      />

      <Typography variant="body2" sx={{ color: '#596b7e', mt: 1.5, minHeight: 42 }}>
        Profil orienté {student.jobTitle || 'numérique'}, fiable et curieux, prêt à renforcer une
        équipe projet.
      </Typography>

      <Stack direction="row" flexWrap="wrap" gap={0.8} sx={{ mt: 1.6 }}>
        {visibleSkills(student.skills).map((skill, index) => (
          <Chip
            key={`${skill.name}-${index}`}
            label={`${skill.name} ${skill.level || 'Intermédiaire'}`}
            size="small"
            sx={{
              borderRadius: 99,
              bgcolor: '#f5efe2',
              color: '#514832',
              fontSize: 11,
              fontWeight: 700,
              border: '1px solid #e9ddc8',
            }}
          />
        ))}
        {(!student.skills || student.skills.length === 0) && (
          <Chip
            label="React Advanced"
            size="small"
            sx={{
              borderRadius: 99,
              bgcolor: '#f5efe2',
              color: '#514832',
              fontSize: 11,
              fontWeight: 700,
            }}
          />
        )}
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.8 }}>
        <Button
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onSelect(student);
          }}
          sx={{
            px: 0,
            minWidth: 'auto',
            color: '#184b78',
            fontSize: 12,
            fontWeight: 900,
            textTransform: 'none',
          }}
        >
          Voir le profil complet
        </Button>

        <Stack direction="row" spacing={0.6}>
          <Tooltip title="Modifier">
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onEdit(student);
              }}
              sx={{ border: '1px solid #bdc8d3', color: '#4d6479' }}
            >
              <EditIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer">
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(student.id);
              }}
              sx={{ border: '1px solid #ff8a98', color: '#e6344d' }}
            >
              <DeleteIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
};
