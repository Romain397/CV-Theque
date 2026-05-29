import { Alert } from '@mui/material';

/**
 * Composant pour afficher une erreur
 * @param {Object} props
 * @param {string|null} props.error - Le message d'erreur à afficher
 * @param {Function} props.onClose - Fonction appelée pour fermer l'alerte
 */
export const ErrorAlert = ({ error, onClose }) => {
  if (!error) return null;

  return (
    <Alert 
      severity="error" 
      onClose={onClose}
      sx={{ marginBottom: 2 }}
    >
      {error}
    </Alert>
  );
};
