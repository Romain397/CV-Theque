import {
  Avatar,
  Box,
  Button,
  Chip,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const initials = (student) =>
  `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase() || 'PR';

const visibleSkills = (skills = []) => skills.slice(0, 3);

export const StudentCard = ({ student, selected, onSelect }) => {
  const schoolHref = student.school?.id ? `/schools/${student.school.id}` : null;
  const companyHref = student.company?.id ? `/companies/${student.company.id}` : null;

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
          <Typography variant="caption" sx={{ color: '#7a8794', display: 'block', mt: 0.5 }}>
            {schoolHref ? (
              <Link
                component={RouterLink}
                to={schoolHref}
                onClick={(event) => event.stopPropagation()}
                underline="hover"
                sx={{ color: '#7a8794', fontWeight: 800 }}
              >
                {student.school?.name}
              </Link>
            ) : (
              'École non renseignée'
            )}
          </Typography>
          {student.company && (
            <Typography variant="caption" sx={{ color: '#7a8794', display: 'block', mt: 0.3 }}>
              Entreprise:{' '}
              {companyHref ? (
                <Link
                  component={RouterLink}
                  to={companyHref}
                  onClick={(event) => event.stopPropagation()}
                  underline="hover"
                  sx={{ color: '#7a8794', fontWeight: 800 }}
                >
                  {student.company.name}
                </Link>
              ) : (
                student.company.name
              )}
            </Typography>
          )}
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
      </Stack>
    </Paper>
  );
};
