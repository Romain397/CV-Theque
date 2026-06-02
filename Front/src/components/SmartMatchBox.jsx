import { useState } from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import * as aiService from '../services/aiService';
import { useHideExtraActions } from '../uiSettings';

const levelLabel = {
  excellent: 'Excellent',
  good: 'Bon',
  medium: 'Moyen',
  weak: 'Faible',
};

export default function SmartMatchBox({
  job,
  profile,
  title = 'Matching profil ↔ offre',
  description = 'Compare le profil sélectionné à cette offre et génère un score de compatibilité.',
}) {
  const [hideExtraActions] = useHideExtraActions();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!job || !profile) return;

    setLoading(true);
    setError(null);

    try {
      const result = await aiService.matchJobProfile(job, profile);
      setMatch(result || null);
    } catch (err) {
      setError(err?.message || 'Impossible de calculer le matching.');
    } finally {
      setLoading(false);
    }
  };

  const hasContent = Boolean(match);
  const score = typeof match?.score === 'number' ? match.score : null;

  if (hideExtraActions && !hasContent) {
    return null;
  }

  return (
    <Box sx={{ mt: 2.5, p: 2.2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'var(--surface-soft)' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}>
        <Box>
          <Typography variant="overline" sx={{ color: 'var(--text-secondary)', letterSpacing: 2, fontWeight: 900 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.25 }}>
            {description}
          </Typography>
        </Box>

        {!hideExtraActions && (
          <Button
            type="button"
            variant="contained"
            onClick={handleGenerate}
            disabled={loading || !job || !profile}
            startIcon={<AutoAwesomeOutlinedIcon />}
            sx={{ textTransform: 'none', fontWeight: 900 }}
          >
            {loading ? 'Analyse...' : !profile ? 'Profil étudiant requis' : hasContent ? 'Réanalyser' : 'Analyser le match'}
          </Button>
        )}
      </Stack>

      {!profile && (
        <Box sx={{ mt: 1.5, p: 1.25, borderRadius: 2, bgcolor: 'var(--accent-soft)', color: 'var(--text-primary)' }}>
          <Typography sx={{ fontWeight: 800 }}>
            Aucun profil étudiant n’est disponible pour le matching.
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.25, color: 'var(--text-secondary)' }}>
            Le bloc reste visible dans le détail de l’offre, mais il faut un compte étudiant connecté pour lancer l’analyse IA.
          </Typography>
        </Box>
      )}

      {error && (
        <Box sx={{ mt: 1.5, p: 1.25, borderRadius: 2, bgcolor: 'rgba(180, 35, 24, 0.08)', color: 'var(--error, #b42318)' }}>
          <Typography sx={{ fontWeight: 800 }}>{error}</Typography>
        </Box>
      )}

      {hasContent && (
        <Box sx={{ mt: 1.75 }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              label={`${score ?? 0}%`}
              sx={{ bgcolor: 'var(--accent-strong)', color: '#fff', fontWeight: 950, fontSize: 16, px: 1.2 }}
            />
            {match?.level && (
              <Chip
                label={levelLabel[match.level] || match.level}
                sx={{ bgcolor: 'var(--muted-bg)', fontWeight: 900 }}
              />
            )}
          </Stack>

          {match?.explanation && (
            <Typography sx={{ color: 'var(--text-primary)', lineHeight: 1.7, mt: 1.25, whiteSpace: 'pre-line' }}>
              {match.explanation}
            </Typography>
          )}

          {Array.isArray(match?.criteria) && match.criteria.length > 0 && (
            <Stack spacing={1} sx={{ mt: 1.5 }}>
              {match.criteria.map((criterion) => (
                <Box key={criterion.label} sx={{ p: 1.2, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 900 }}>{criterion.label}</Typography>
                    <Chip label={`${criterion.score ?? 0}%`} size="small" sx={{ bgcolor: 'var(--muted-bg)', fontWeight: 900 }} />
                  </Stack>
                  {criterion.note && (
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5, whiteSpace: 'pre-line' }}>
                      {criterion.note}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          )}

          {Array.isArray(match?.matchedSkills) && match.matchedSkills.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 1.4 }}>
              {match.matchedSkills.map((item) => (
                <Chip key={item} label={item} size="small" sx={{ bgcolor: 'rgba(16, 185, 129, 0.14)', color: 'var(--success, #027a48)', fontWeight: 800 }} />
              ))}
            </Stack>
          )}

          {Array.isArray(match?.missingSkills) && match.missingSkills.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 1.2 }}>
              {match.missingSkills.map((item) => (
                <Chip key={item} label={item} size="small" sx={{ bgcolor: 'rgba(180, 35, 24, 0.12)', color: 'var(--error, #b42318)', fontWeight: 800 }} />
              ))}
            </Stack>
          )}

          {Array.isArray(match?.warnings) && match.warnings.length > 0 && (
            <Box sx={{ mt: 1.4, p: 1.25, borderRadius: 2, bgcolor: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning, #8a5a00)' }}>
              <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Points à surveiller</Typography>
              <Typography sx={{ whiteSpace: 'pre-line' }}>
                {match.warnings.join(' • ')}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
