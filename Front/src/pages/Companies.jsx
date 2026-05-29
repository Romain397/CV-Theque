import React, { useEffect, useState } from 'react';
import * as companiesService from '../services/companiesService';
import { EntityDirectory } from '../components/EntityDirectory';
import { getCompanyProfile } from '../data/entityProfiles';

export default function Companies(){
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    companiesService.getCompanies().then((data) => { if (mounted) setCompanies(data); }).catch((e) => setError(String(e)));
    return () => { mounted = false; };
  }, []);

  return (
    <EntityDirectory
      title="Entreprises partenaires"
      eyebrow="Réseau entreprises"
      intro="Parcourez les entreprises avec une interface de recherche claire, des cartes plus riches et un accès direct à leur profil complet."
      entities={error ? [] : companies}
      profileByEntity={getCompanyProfile}
      profileRoute={(company) => `/companies/${company.id}`}
      searchPlaceholder="Rechercher une entreprise, une ville ou une expertise"
      emptyLabel="Aucune entreprise ne correspond à votre recherche"
      error={error}
    />
  );
}
