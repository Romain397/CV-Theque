import { CircularProgress, Box } from '@mui/material';

/**
 * Composant pour afficher un indicateur de chargement
 * @param {Object} props
 * @param {boolean} props.loading - Indique si le chargement est en cours
 */
export const LoadingIndicator = ({ loading }) => {
  if (!loading) return null;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
      <CircularProgress />
    </Box>
  );
};
