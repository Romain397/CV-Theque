import { useMemo, useState } from 'react';
import { Box, Chip, Stack, TextField, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

const normalizeTag = (value) => String(value || '').trim();

export function TagChipsInput({
  label,
  helperText,
  tags = [] ,
  onChange,
  placeholder = 'Ajouter un tag',
}) {
  const [inputValue, setInputValue] = useState('');

  const normalizedTags = useMemo(
    () => Array.from(new Set(tags.map(normalizeTag).filter(Boolean))),
    [tags]
  );

  const commitTag = (rawValue) => {
    const tag = normalizeTag(rawValue);
    if (!tag) return;

    const nextTags = Array.from(new Set([...normalizedTags, tag]));
    onChange?.(nextTags);
    setInputValue('');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commitTag(inputValue);
    }
  };

  return (
    <Box>
      {label && (
        <Typography variant="body2" sx={{ fontWeight: 800, color: '#102339', mb: 0.8 }}>
          {label}
        </Typography>
      )}

      <Stack direction="row" flexWrap="wrap" gap={0.8} sx={{ mb: 1 }}>
        {normalizedTags.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            onDelete={() => onChange?.(normalizedTags.filter((item) => item !== tag))}
            deleteIcon={<CloseRoundedIcon sx={{ fontSize: 14 }} />}
            sx={{
              borderRadius: 99,
              bgcolor: '#eef4fb',
              color: '#1f5f9d',
              fontWeight: 800,
              border: '1px solid #d4e5f4',
              '& .MuiChip-deleteIcon': {
                opacity: 0,
                transition: 'opacity .15s ease',
                color: '#1f5f9d',
                ml: 0.25,
              },
              '&:hover .MuiChip-deleteIcon': {
                opacity: 1,
              },
            }}
          />
        ))}
      </Stack>

      <TextField
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commitTag(inputValue)}
        placeholder={placeholder}
        helperText={helperText}
        fullWidth
        size="small"
      />
    </Box>
  );
}

export default TagChipsInput;