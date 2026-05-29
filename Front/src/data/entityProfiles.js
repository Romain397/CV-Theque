const buildLinks = (name, website) => [
  { label: 'Site web', href: website, platform: 'website' },
  { label: 'LinkedIn', href: `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(name)}`, platform: 'linkedin' },
  { label: 'X', href: `https://x.com/search?q=${encodeURIComponent(name)}&src=typed_query`, platform: 'x' },
  { label: 'YouTube', href: `https://www.youtube.com/results?search_query=${encodeURIComponent(name)}`, platform: 'youtube' },
];

export const schoolProfiles = {
  'Ecole Hexagone': {
    tagline: 'Formation produit, design et développement web',
    summary:
      'Une école orientée projets qui forme des profils capables de concevoir, développer et livrer des produits numériques utiles.',
    website: 'https://www.ecole-hexagone.com/',
    metrics: [
      { label: 'Campus', value: 'Paris' },
      { label: 'Promotion', value: '420 étudiants' },
      { label: 'Diplômés', value: '1 200+' },
      { label: 'Focus', value: 'Web & produit' },
    ],
    specialties: ['Développement frontend', 'UI / UX', 'Cloud', 'Culture produit'],
    highlights: [
      'Pédagogie par projet avec des livrables concrets',
      'Accompagnement carrière et coaching portfolio',
      'Mise en relation avec les entreprises partenaires',
    ],
    socials: buildLinks('Ecole Hexagone', 'https://www.ecole-hexagone.com/'),
  },
  'Ecole du Web': {
    tagline: 'Campus digital centré sur le code et l’emploi',
    summary:
      'Un environnement d’apprentissage qui met l’accent sur les compétences opérationnelles et l’insertion en entreprise.',
    website: 'https://www.ecoleduweb.com/',
    metrics: [
      { label: 'Campus', value: 'Lyon' },
      { label: 'Promotion', value: '260 étudiants' },
      { label: 'Partenaires', value: '80 entreprises' },
      { label: 'Focus', value: 'Web full stack' },
    ],
    specialties: ['JavaScript', 'Frameworks modernes', 'APIs', 'Méthodes agiles'],
    highlights: [
      'Parcours intensifs orientés mise en pratique',
      'Projets collectifs et cas d’usage métiers',
      'Suivi de l’employabilité des étudiants',
    ],
    socials: buildLinks('Ecole du Web', 'https://www.ecoleduweb.com/'),
  },
};

export const schoolOrder = ['Ecole Hexagone', 'Ecole du Web'];

export const companyProfiles = {
  HexaCorp: {
    tagline: 'Scale-up produit qui recrute des profils web',
    summary:
      'Une équipe produit qui construit des interfaces rapides, des parcours clairs et des outils internes solides pour ses utilisateurs.',
    website: 'https://www.hexacorp.io/',
    metrics: [
      { label: 'Ville', value: 'Paris' },
      { label: 'Taille', value: '120 collaborateurs' },
      { label: 'Postes ouverts', value: '18' },
      { label: 'Stack', value: 'React / Node' },
    ],
    specialties: ['Product design', 'Frontend', 'Backend API', 'Data'],
    highlights: [
      'Culture produit et itérations rapides',
      'Équipe pluridisciplinaire orientée qualité',
      'Offres junior et alternance visibles',
    ],
    socials: buildLinks('HexaCorp', 'https://www.hexacorp.io/'),
  },
  WebSolutions: {
    tagline: 'Agence technique et produit à forte culture delivery',
    summary:
      'Une structure qui accompagne des clients dans la conception, le développement et la maintenance d’applications web.',
    website: 'https://www.websolutions.dev/',
    metrics: [
      { label: 'Ville', value: 'Nantes' },
      { label: 'Taille', value: '60 collaborateurs' },
      { label: 'Postes ouverts', value: '11' },
      { label: 'Stack', value: 'Vue / Node' },
    ],
    specialties: ['Delivery agile', 'Architecture web', 'Intégration', 'Support technique'],
    highlights: [
      'Projets clients à fort impact métier',
      'Équipes autonomes et proches du produit',
      'Ouverture aux jeunes diplômés',
    ],
    socials: buildLinks('WebSolutions', 'https://www.websolutions.dev/'),
  },
};

export const companyOrder = ['HexaCorp', 'WebSolutions'];

export const getSchoolProfile = (school) => {
  const fallback = schoolProfiles[school?.name] || {
  tagline: 'Profil école',
  summary: 'Cette école est présente dans la base, avec un profil enrichi côté front.',
  website: '#',
  metrics: [
    { label: 'Campus', value: school?.location || 'Non précisé' },
    { label: 'Promotion', value: '—' },
    { label: 'Diplômés', value: '—' },
    { label: 'Focus', value: 'Formation web' },
  ],
  specialties: ['Développement web', 'Projet', 'Alternance'],
  highlights: ['Informations complémentaires à enrichir'],
  socials: buildLinks(school?.name || 'Ecole', '#'),
  };

  return {
    ...fallback,
    specialties: Array.isArray(school?.specialties) && school.specialties.length ? school.specialties : fallback.specialties,
  };
};

export const getSchoolSpecialties = (school) => {
  const fallback = getSchoolProfile(school).specialties || [];
  return Array.isArray(school?.specialties) && school.specialties.length ? school.specialties : fallback;
};

export const getSchoolNameById = (id) => schoolOrder[Number(id) - 1] || schoolOrder[0];

export const getCompanyProfile = (company) => {
  const fallback = companyProfiles[company?.name] || {
  tagline: 'Profil entreprise',
  summary: 'Cette entreprise est présente dans la base, avec un profil enrichi côté front.',
  website: '#',
  metrics: [
    { label: 'Ville', value: company?.location || 'Non précisé' },
    { label: 'Taille', value: '—' },
    { label: 'Postes ouverts', value: '—' },
    { label: 'Stack', value: 'Web' },
  ],
  specialties: ['Produit', 'Web', 'Recrutement'],
  highlights: ['Informations complémentaires à enrichir'],
  socials: buildLinks(company?.name || 'Entreprise', '#'),
  };

  return {
    ...fallback,
    specialties: Array.isArray(company?.specialties) && company.specialties.length ? company.specialties : fallback.specialties,
  };
};

export const getCompanySpecialties = (company) => {
  const fallback = getCompanyProfile(company).specialties || [];
  return Array.isArray(company?.specialties) && company.specialties.length ? company.specialties : fallback;
};

export const getCompanyNameById = (id) => companyOrder[Number(id) - 1] || companyOrder[0];
