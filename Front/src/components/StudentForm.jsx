import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';

/**
 * Composant formulaire pour ajouter ou éditer un étudiant
 * @param {Object} props
 * @param {boolean} props.open - Indique si le formulaire est ouvert
 * @param {Object|null} props.student - L'étudiant à éditer (null si création)
 * @param {Function} props.onClose - Fonction appelée pour fermer le formulaire
 * @param {Function} props.onSubmit - Fonction appelée à la soumission du formulaire
 * @param {boolean} props.loading - Indique si l'envoi est en cours
 */
export const StudentForm = ({ open, student, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    jobTitle: '',
    location: '',
  });

  const [errors, setErrors] = useState({});

  /**
   * Initialise le formulaire avec les données de l'étudiant s'il y en a un
   */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Synchronise la modale avec l'etudiant selectionne.
    if (student) {
      setFormData({
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        age: student.age || '',
        jobTitle: student.jobTitle || '',
        location: student.location || '',
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        age: '',
        jobTitle: '',
        location: '',
      });
    }
    setErrors({});
  }, [student, open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /**
   * Valide le formulaire
   */
  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'Le prénom est requis';
    if (!formData.lastName.trim()) newErrors.lastName = 'Le nom est requis';
    if (!formData.age || formData.age < 0) newErrors.age = 'L\'âge valide est requis';
    if (!formData.jobTitle.trim()) newErrors.jobTitle = 'Le poste recherché est requis';
    if (!formData.location.trim()) newErrors.location = 'La localisation est requise';
    return newErrors;
  };

  /**
   * Gère le changement des champs du formulaire
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Efface l'erreur du champ si l'utilisateur commence à le corriger
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  /**
   * Gère la soumission du formulaire
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit(formData);
      setFormData({
        firstName: '',
        lastName: '',
        age: '',
        jobTitle: '',
        location: '',
      });
    } catch (error) {
      // L'erreur est gérée dans le hook useStudents
      console.error('Erreur lors de la soumission:', error);
    }
  };

  const isEditing = !!student;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditing ? 'Éditer l\'étudiant' : 'Ajouter un nouvel étudiant'}
      </DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            name="firstName"
            label="Prénom"
            value={formData.firstName}
            onChange={handleChange}
            error={!!errors.firstName}
            helperText={errors.firstName}
            fullWidth
          />
          <TextField
            name="lastName"
            label="Nom"
            value={formData.lastName}
            onChange={handleChange}
            error={!!errors.lastName}
            helperText={errors.lastName}
            fullWidth
          />
          <TextField
            name="age"
            label="Âge"
            type="number"
            value={formData.age}
            onChange={handleChange}
            error={!!errors.age}
            helperText={errors.age}
            fullWidth
          />
          <TextField
            label="Poste recherché"
            name="jobTitle"
            value={formData.jobTitle}
            onChange={handleChange}
            error={!!errors.jobTitle}
            helperText={errors.jobTitle}
            fullWidth
          />
          <TextField
            name="location"
            label="Localisation"
            value={formData.location}
            onChange={handleChange}
            error={!!errors.location}
            helperText={errors.location}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={isEditing ? <SaveIcon /> : <AddIcon />}
        >
          {isEditing ? 'Mettre à jour' : 'Ajouter'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
