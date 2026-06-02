import { useState } from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import * as aiService from '../services/aiService';
import { useHideExtraActions } from '../uiSettings';

export default function SmartSummaryBox({
  type,
  profile,
  title = 'Résumé intelligent',
  description = 'Génère un résumé court, propre et homogène pour les cartes et aperçus.',
}) {
  const [hideExtraActions] = useHideExtraActions();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!profile) return;

    setLoading(true);
    setError(null);

    try {
      const result = await aiService.summarizeProfile(type, profile);
      setSummary(result || null);
    } catch (err) {
      setError(err?.message || 'Impossible de générer le résumé.');
    } finally {
      setLoading(false);
    }
  };

  const hasContent = Boolean(summary?.summary || (summary?.highlights || []).length || (summary?.keywords || []).length);

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
            disabled={loading || !profile}
            startIcon={<AutoAwesomeOutlinedIcon />}
            sx={{ textTransform: 'none', fontWeight: 900 }}
          >
            {loading ? 'Génération...' : hasContent ? 'Rafraîchir' : 'Générer'}
          </Button>
        )}
      </Stack>

      {error && (
        <Box sx={{ mt: 1.5, p: 1.25, borderRadius: 2, bgcolor: 'rgba(180, 35, 24, 0.08)', color: 'var(--error, #b42318)' }}>
          <Typography sx={{ fontWeight: 800 }}>{error}</Typography>
        </Box>
      )}

      {hasContent && (
        <Box sx={{ mt: 1.75 }}>
          {summary?.title && (
            <Typography sx={{ fontWeight: 900, mb: 0.5 }}>
              {summary.title}
            </Typography>
          )}
          {summary?.summary && (
            <Typography sx={{ color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {summary.summary}
            </Typography>
          )}
          {Array.isArray(summary?.highlights) && summary.highlights.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 1.4 }}>
              {summary.highlights.map((item) => (
                <Chip key={item} label={item} size="small" sx={{ bgcolor: 'var(--accent-soft)', fontWeight: 800 }} />
              ))}
            </Stack>
          )}
          {Array.isArray(summary?.keywords) && summary.keywords.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 1.2 }}>
              {summary.keywords.map((item) => (
                <Chip key={item} label={item} size="small" sx={{ bgcolor: 'var(--muted-bg)', fontWeight: 800 }} />
              ))}
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
}
