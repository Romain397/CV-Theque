import {
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

/**
 * Composant pour afficher une carte étudiant
 * @param {Object} props
 * @param {Object} props.student - Les données de l'étudiant
 * @param {Function} props.onEdit - Fonction appelée pour éditer l'étudiant
 * @param {Function} props.onDelete - Fonction appelée pour supprimer l'étudiant
 */
export const StudentCard = ({ student, onEdit, onDelete }) => {
  return (
    <Card sx={{ mb: 2, border: '1px solid #e0e0e0' }}>
      <CardContent>
        <Typography variant="h6" component="div" gutterBottom>
          {student.firstName} {student.lastName}
        </Typography>

        <Box sx={{ mb: 1 }}>
          <Typography color="textSecondary" variant="body2">
            <strong>Âge:</strong> {student.age}
          </Typography>
          <Typography color="textSecondary" variant="body2">
            <strong>Poste recherché:</strong> {student.jobTitle}
          </Typography>
          <Typography color="textSecondary" variant="body2">
            <strong>Localisation:</strong> {student.location}
          </Typography>
        </Box>

        {student.skills && student.skills.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography color="textSecondary" variant="body2" sx={{ mb: 0.5 }}>
              <strong>Compétences:</strong>
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {student.skills.map((skill, index) => (
                <Chip
                  key={index}
                  label={`${skill.name} - ${skill.level}`}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}

        {student.projects && student.projects.length > 0 && (
          <Box>
            <Typography color="textSecondary" variant="body2" sx={{ mb: 0.5 }}>
              <strong>Projets:</strong>
            </Typography>
            <Typography variant="body2">
              {student.projects.length} projet(s)
            </Typography>
          </Box>
        )}
      </CardContent>

      <CardActions>
        <Button
          size="small"
          color="primary"
          startIcon={<EditIcon />}
          onClick={() => onEdit(student)}
        >
          Éditer
        </Button>
        <Button
          size="small"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => onDelete(student.id)}
        >
          Supprimer
        </Button>
      </CardActions>
    </Card>
  );
};
