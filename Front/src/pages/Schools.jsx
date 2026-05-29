import React, { useEffect, useState } from 'react';
import * as schoolsService from '../services/schoolsService';
import { EntityDirectory } from '../components/EntityDirectory';
import { getSchoolProfile } from '../data/entityProfiles';

export default function Schools(){
  const [schools, setSchools] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    schoolsService.getSchools()
      .then((data) => {
        if (mounted) {
          setSchools(data);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(String(err));
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <EntityDirectory
      title="Écoles partenaires"
      eyebrow="Réseau écoles"
      intro="Explorez les écoles comme des profils complets: recherche, tri, cartes détaillées et accès direct à leur page dédiée."
      entities={error ? [] : schools}
      profileByEntity={getSchoolProfile}
      profileRoute={(school) => `/schools/${school.id}`}
      searchPlaceholder="Rechercher une école, une ville ou une spécialité"
      emptyLabel="Aucune école ne correspond à votre recherche"
      error={error}
    />
  );
}
