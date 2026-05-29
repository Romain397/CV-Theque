import { useState } from 'react';
import {
  Container,
  Box,
  Button,
  Typography,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useStudents } from '../hooks/useStudents';
import { StudentCard } from './StudentCard';
import { StudentForm } from './StudentForm';
import { LoadingIndicator } from './LoadingIndicator';
import { ErrorAlert } from './ErrorAlert';

/**
 * COMPOSANT PRINCIPAL - StudentsList
 * ===================================
 * 
 * C'est le composant qui:
 * 1. Utilise le hook useStudents pour récupérer les données
 * 2. Affiche la liste des étudiants
 * 3. Gère l'ajout, la modification et la suppression
 * 4. Affiche les indicateurs de chargement et les erreurs
 * 
 * 💡 Les "données" (students, loading, error) viennent du hook
 * 💡 Ce composant ne fait AUCUN fetch() lui-même
 */
export const StudentsList = () => {
  // 🎣 Utiliser le hook personnalisé pour obtenir les données et les fonctions
  const {
    students,           // 📊 Liste des étudiants
    loading,            // ⏳ True si en cours de chargement
    error,              // ⚠️ Message d'erreur ou null
    refresh,            // 🔄 Fonction pour rafraîchir
    addStudent,         // ➕ Fonction pour ajouter
    updateStudentItem,  // ✏️ Fonction pour mettre à jour
    removeStudent,      // ❌ Fonction pour supprimer
  } = useStudents();

  // 🔹 État local pour gérer le formulaire
  const [formOpen, setFormOpen] = useState(false);      // Formulaire ouvert ou fermé ?
  const [selectedStudent, setSelectedStudent] = useState(null); // Quel étudiant éditer ? null = créer nouveau
  const [submitting, setSubmitting] = useState(false);   // Est-on en train d'envoyer ?

  /**
   * Ouvrir le formulaire pour CRÉER un nouvel étudiant
   */
  const handleAddClick = () => {
    setSelectedStudent(null); // Pas d'étudiant sélectionné = mode création
    setFormOpen(true);        // Ouvrir le formulaire
  };

  /**
   * Ouvrir le formulaire pour ÉDITER un étudiant existant
   */
  const handleEditClick = (student) => {
    setSelectedStudent(student); // Sélectionner l'étudiant à éditer
    setFormOpen(true);           // Ouvrir le formulaire
  };

  /**
   * Fermer le formulaire sans sauvegarder
   */
  const handleFormClose = () => {
    setFormOpen(false);
    setSelectedStudent(null);
  };

  /**
   * Gérer la soumission du formulaire (création OU mise à jour)
   */
  const handleFormSubmit = async (formData) => {
    setSubmitting(true);
    try {
      if (selectedStudent) {
        // ✏️ Mode ÉDITION - mettre à jour l'étudiant existant
        await updateStudentItem(selectedStudent.id, formData);
      } else {
        // ➕ Mode CRÉATION - ajouter un nouvel étudiant
        await addStudent(formData);
      }
      // Fermer le formulaire après succès
      handleFormClose();
    } catch (err) {
      // L'erreur s'affiche grâce au composant ErrorAlert
      console.error('Erreur lors de la soumission:', err);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Gérer la suppression d'un étudiant
   * (avec confirmation pour éviter les accidents !)
   */
  const handleDeleteClick = async (id) => {
    // Demander confirmation avant de supprimer
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet étudiant ?')) {
      try {
        await removeStudent(id);
      } catch (err) {
        console.error('Erreur lors de la suppression:', err);
      }
    }
  };

  /**
   * Fermer l'alerte d'erreur en rafraîchissant
   */
  const handleCloseError = () => {
    refresh();
  };

  // 🎨 RENDU du composant
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* 📝 Titre et info */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Gestion des Étudiants
        </Typography>
        <Typography color="textSecondary" gutterBottom>
          {students.length} étudiant(s) inscrit(s)
        </Typography>
      </Box>

      {/* ⚠️ Affichage des erreurs (s'affiche si error n'est pas null) */}
      <ErrorAlert error={error} onClose={handleCloseError} />

      {/* ⏳ Affichage du spinner de chargement (s'affiche si loading === true) */}
      <LoadingIndicator loading={loading} />

      {/* 🔘 Boutons d'action */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddClick}
          disabled={loading}
        >
          Ajouter un étudiant
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={refresh}
          disabled={loading}
        >
          Rafraîchir
        </Button>
      </Box>

      {/* 📊 Liste des étudiants OU message vide */}
      {!loading && students.length === 0 ? (
        // ➡️ Si aucun étudiant ET pas en train de charger
        <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
          <Typography color="textSecondary">
            Aucun étudiant pour le moment. Commencez par en ajouter un.
          </Typography>
        </Paper>
      ) : (
        // ➡️ Sinon, afficher la liste
        <Box>
          {students.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          ))}
        </Box>
      )}

      {/* 📋 Formulaire add/edit (modale) */}
      <StudentForm
        open={formOpen}
        student={selectedStudent}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        loading={submitting}
      />
    </Container>
  );
};
