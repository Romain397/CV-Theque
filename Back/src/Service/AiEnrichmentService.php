<?php

namespace App\Service;

final class AiEnrichmentService
{
    private const CACHE_SCHEMA_VERSION = 3;

    private string $projectDir;
    private string $ollamaUrl;
    private string $ollamaModel;

    public function __construct(string $projectDir)
    {
        $this->projectDir = rtrim($projectDir, '/');
        $this->ollamaUrl = rtrim((string) (getenv('OLLAMA_URL') ?: 'http://127.0.0.1:11434'), '/');
        $this->ollamaModel = (string) (getenv('OLLAMA_MODEL') ?: 'llama3.1');
    }

    /**
     * @param array<string, mixed> $job
     * @return array<string, mixed>
     */
    public function enrichJob(array $job, bool $allowNetwork = false): array
    {
        $signature = $this->jobSignature($job);
        $cached = $this->readCache($signature);

        if (is_array($cached)) {
            return $this->attachEnrichment($job, $cached);
        }

        $enrichment = $allowNetwork ? ($this->callOllama($job) ?? $this->fallbackEnrichment($job)) : $this->fallbackEnrichment($job);
        $enrichment = $this->sanitizeEnrichment($enrichment, $job);
        $this->writeCache($signature, $enrichment);

        return $this->attachEnrichment($job, $enrichment);
    }

    /**
     * @param array<int, array<string, mixed>> $jobs
     * @return array<int, array<string, mixed>>
     */
    public function enrichJobs(array $jobs, bool $allowNetwork = false): array
    {
        $enriched = array_map(fn (array $job): array => $this->enrichJob($job, $allowNetwork), $jobs);

        return $this->markPotentialDuplicates($enriched);
    }

    /**
     * @param string $type
     * @param array<string, mixed> $profile
     * @return array<string, mixed>
     */
    public function summarizeProfile(string $type, array $profile): array
    {
        $type = in_array($type, ['student', 'company', 'school', 'profile'], true) ? $type : 'profile';
        $signature = 'profile:' . hash('sha256', json_encode([
            'type' => $type,
            'profile' => $profile,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        $cached = $this->readCache($signature);
        if (is_array($cached)) {
            return $cached;
        }

        $summary = $this->callProfileSummaryOllama($type, $profile) ?? $this->fallbackProfileSummary($type, $profile);
        $summary = $this->sanitizeProfileSummary($type, $profile, $summary);
        $this->writeCache($signature, $summary);

        return $summary;
    }

    /**
     * @param array<string, mixed> $job
     * @param array<string, mixed> $profile
     * @return array<string, mixed>
     */
    public function matchJobProfile(array $job, array $profile): array
    {
        $signature = 'match:' . hash('sha256', json_encode([
            'job' => $job,
            'profile' => $profile,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        $cached = $this->readCache($signature);
        if (is_array($cached)) {
            return $cached;
        }

        $match = $this->callJobMatchOllama($job, $profile) ?? $this->fallbackJobMatch($job, $profile);
        $match = $this->sanitizeJobMatch($job, $profile, $match);
        $this->writeCache($signature, $match);

        return $match;
    }

    /**
     * @param array<string, mixed> $job
     * @param array<string, mixed> $enrichment
     * @return array<string, mixed>
     */
    private function attachEnrichment(array $job, array $enrichment): array
    {
        $job['enrichment'] = $enrichment;

        return $job;
    }

    /**
     * @param array<string, mixed> $job
     * @return string
     */
    private function jobSignature(array $job): string
    {
        return hash('sha256', json_encode([
            'title' => $job['title'] ?? null,
            'description' => $job['description'] ?? null,
            'tags' => array_values(array_map('strval', $job['tags'] ?? [])),
            'company' => $job['company']['name'] ?? null,
            'location' => $job['company']['location'] ?? ($job['details']['location']['label'] ?? null),
            'source' => $job['source'] ?? null,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    /**
     * @param array<string, mixed> $job
     * @return array<string, mixed>|null
     */
    private function callOllama(array $job): ?array
    {
        $prompt = $this->buildPrompt($job);
        $payload = json_encode([
            'model' => $this->ollamaModel,
            'stream' => false,
            'format' => 'json',
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'Tu nettoies et enrichis des offres d emploi pour une plateforme de mise en relation. Tu réponds uniquement en JSON valide, sans texte autour.',
                ],
                [
                    'role' => 'user',
                    'content' => $prompt,
                ],
            ],
            'options' => [
                'temperature' => 0.1,
            ],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if (!is_string($payload)) {
            return null;
        }

        $response = $this->postJson($this->ollamaUrl . '/api/chat', $payload);

        if (!is_array($response) || !is_string($response['message']['content'] ?? null)) {
            return null;
        }

        return $this->decodeJsonObject($response['message']['content']);
    }

    /**
     * @param string $type
     * @param array<string, mixed> $profile
     * @return array<string, mixed>|null
     */
    private function callProfileSummaryOllama(string $type, array $profile): ?array
    {
        $payload = json_encode([
            'model' => $this->ollamaModel,
            'stream' => false,
            'format' => 'json',
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'Tu écris des résumés courts et propres pour des profils de plateforme. Tu réponds uniquement en JSON valide, sans texte autour.',
                ],
                [
                    'role' => 'user',
                    'content' => $this->buildProfilePrompt($type, $profile),
                ],
            ],
            'options' => [
                'temperature' => 0.2,
            ],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if (!is_string($payload)) {
            return null;
        }

        $response = $this->postJson($this->ollamaUrl . '/api/chat', $payload);

        if (!is_array($response) || !is_string($response['message']['content'] ?? null)) {
            return null;
        }

        return $this->decodeJsonObject($response['message']['content']);
    }

    /**
     * @param array<string, mixed> $job
     * @param array<string, mixed> $profile
     * @return array<string, mixed>|null
     */
    private function callJobMatchOllama(array $job, array $profile): ?array
    {
        $payload = json_encode([
            'model' => $this->ollamaModel,
            'stream' => false,
            'format' => 'json',
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'Tu compares un profil étudiant à une offre d emploi. Tu réponds uniquement en JSON valide, sans texte autour.',
                ],
                [
                    'role' => 'user',
                    'content' => $this->buildJobMatchPrompt($job, $profile),
                ],
            ],
            'options' => [
                'temperature' => 0.15,
            ],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if (!is_string($payload)) {
            return null;
        }

        $response = $this->postJson($this->ollamaUrl . '/api/chat', $payload);

        if (!is_array($response) || !is_string($response['message']['content'] ?? null)) {
            return null;
        }

        return $this->decodeJsonObject($response['message']['content']);
    }

    /**
     * @param array<string, mixed> $job
     * @return string
     */
    private function buildPrompt(array $job): string
    {
        $details = $job['details'] ?? [];
        $company = $job['company'] ?? [];
        $lines = [
            'Offre brute à nettoyer et enrichir.',
            'Retourne un JSON strict avec les clés suivantes:',
            '- canonicalTitle: string',
            '- normalizedTags: array de 3 à 8 tags courts, en français, sans doublons',
            '- keywords: array de 5 à 10 mots-clés métiers',
            '- summary: résumé court en 1 ou 2 phrases',
            '- warnings: array de chaînes si des données semblent ambiguës ou incomplètes',
            '',
            'Règles:',
            '- ne pas inventer d informations absentes',
            '- conserver le sens métier',
            '- reformuler les titres trop longs ou répétitifs',
            '- privilégier des tags harmonisés comme Frontend, Backend, Recrutement, Alternance, Communication, RH, Design',
            '',
            'Données:',
            'Titre: ' . (string) ($job['title'] ?? ''),
            'Source: ' . (string) ($job['source'] ?? ''),
            'Entreprise: ' . (string) ($company['name'] ?? $details['company']['name'] ?? ''),
            'Localisation: ' . (string) ($company['location'] ?? $details['location']['label'] ?? ''),
            'Tags existants: ' . implode(', ', array_map('strval', $job['tags'] ?? [])),
            'Description: ' . $this->compactText((string) ($job['description'] ?? $details['summary'] ?? $details['description'] ?? '')),
        ];

        return implode("\n", $lines);
    }

    /**
     * @param string $type
     * @param array<string, mixed> $profile
     * @return string
     */
    private function buildProfilePrompt(string $type, array $profile): string
    {
        $lines = [
            'Profil à résumer.',
            'Retourne un JSON strict avec les clés:',
            '- summary: 2 phrases maximum, ton clair et professionnel',
            '- highlights: array de 3 à 5 points courts',
            '- keywords: array de 5 à 8 mots-clés',
            '- title: intitulé court et lisible',
            '',
            'Règles:',
            '- ne pas inventer d informations absentes',
            '- garder un ton neutre et utile pour une carte ou une preview',
            '- le résumé doit être court, lisible et homogène',
            '',
            'Type: ' . $type,
            'Données: ' . json_encode($profile, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ];

        return implode("\n", $lines);
    }

    /**
     * @param array<string, mixed> $job
     * @param array<string, mixed> $profile
     * @return string
     */
    private function buildJobMatchPrompt(array $job, array $profile): string
    {
        $details = $job['details'] ?? [];
        $company = $job['company'] ?? [];

        $lines = [
            'Comparer un profil étudiant à une offre et retourner un JSON strict.',
            'Clés attendues:',
            '- score: entier de 0 à 100',
            '- level: excellent, good, medium, weak',
            '- explanation: 1 ou 2 phrases courtes expliquant pourquoi le match est pertinent ou à renforcer',
            '- matchedSkills: array de compétences communes',
            '- missingSkills: array de compétences ou attentes manquantes',
            '- criteria: array de 5 objets avec label, score, note',
            '- warnings: array de chaînes si certaines données sont incomplètes',
            '',
            'Critères attendus dans criteria:',
            '- Compétences communes',
            '- Niveau d études',
            '- Localisation',
            '- Type de contrat',
            '- Tags proches',
            '',
            'Règles:',
            '- ne pas inventer d informations absentes',
            '- être concis, concret et utile pour l interface',
            '- utiliser des phrases courtes et lisibles',
            '- si une donnée manque, l indiquer clairement',
            '',
            'Offre:',
            'Titre: ' . (string) ($job['title'] ?? ''),
            'Entreprise: ' . (string) ($company['name'] ?? $details['company']['name'] ?? ''),
            'Localisation: ' . (string) ($company['location'] ?? $details['location']['label'] ?? ''),
            'Contrat: ' . (string) ($details['contract'] ?? ''),
            'Salaire: ' . (string) ($details['salary'] ?? ''),
            'Niveau d études: ' . implode(', ', $this->toTextList($details['educationRequirements'] ?? [])),
            'Tags offre: ' . implode(', ', $this->toTextList($job['tags'] ?? [])),
            'Description: ' . $this->compactText((string) ($job['description'] ?? $details['summary'] ?? $details['description'] ?? '')),
            '',
            'Profil étudiant:',
            'Nom: ' . trim((string) (($profile['firstName'] ?? '') . ' ' . ($profile['lastName'] ?? ''))),
            'Intitulé: ' . (string) ($profile['headline'] ?? $profile['jobTitle'] ?? ''),
            'Localisation: ' . (string) ($profile['location'] ?? ''),
            'Ecole: ' . (string) ($profile['schoolName'] ?? ''),
            'Entreprise: ' . (string) ($profile['companyName'] ?? ''),
            'Compétences: ' . implode(', ', $this->toTextList($profile['skills'] ?? [])),
            'Bio: ' . $this->compactText((string) ($profile['bio'] ?? '')),
            'Données brutes: ' . json_encode([
                'job' => [
                    'tags' => $job['tags'] ?? [],
                    'companySpecialties' => $company['specialties'] ?? [],
                    'sections' => $details['sections'] ?? [],
                ],
                'profile' => [
                    'education' => $profile['education'] ?? [],
                    'projects' => $profile['projects'] ?? [],
                ],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ];

        return implode("\n", $lines);
    }

    /**
     * @param array<string, mixed> $job
     * @return array<string, mixed>
     */
    private function fallbackEnrichment(array $job): array
    {
        $title = trim((string) ($job['title'] ?? ''));
        $description = trim((string) ($job['description'] ?? $job['details']['summary'] ?? $job['details']['description'] ?? ''));
        $existingTags = array_values(array_unique(array_filter(array_map([$this, 'normalizeTagValue'], $job['tags'] ?? []))));
        $keywords = $this->extractKeywords($title . ' ' . $description . ' ' . implode(' ', $existingTags));

        return [
            'canonicalTitle' => $this->cleanTitle($title),
            'normalizedTags' => $this->harmonizeTags(array_merge($existingTags, $keywords)),
            'keywords' => $keywords,
            'summary' => $description !== '' ? $this->shorten($description, 2) : $this->cleanTitle($title),
            'warnings' => [],
        ];
    }

    /**
     * @param string $type
     * @param array<string, mixed> $profile
     * @return array<string, mixed>
     */
    private function fallbackProfileSummary(string $type, array $profile): array
    {
        $summary = '';
        $highlights = [];
        $keywords = [];
        $title = '';

        if ($type === 'student') {
            $name = trim((string) (($profile['firstName'] ?? '') . ' ' . ($profile['lastName'] ?? '')));
            $headline = trim((string) ($profile['headline'] ?? $profile['jobTitle'] ?? ''));
            $bio = trim((string) ($profile['bio'] ?? ''));
            $skills = $this->toTextList($profile['skills'] ?? []);
            $location = trim((string) ($profile['location'] ?? ''));

            $title = $headline !== '' ? $headline : ($name !== '' ? $name : 'Profil étudiant');
            $summary = trim(implode(' ', array_filter([
                $name !== '' ? $name : null,
                $headline !== '' ? $headline : null,
                $location !== '' ? 'basé à ' . $location : null,
                $bio !== '' ? $this->shorten($bio, 2) : null,
            ])));
            $highlights = array_slice(array_filter([
                $location !== '' ? 'Localisation: ' . $location : null,
                $skills !== [] ? 'Compétences: ' . implode(', ', array_slice($skills, 0, 4)) : null,
                $profile['schoolName'] ?? null,
                $profile['companyName'] ?? null,
            ]), 0, 5);
            $keywords = array_slice(array_values(array_unique(array_merge($skills, $this->extractKeywords($headline . ' ' . $bio)))), 0, 8);
        } elseif ($type === 'company') {
            $name = trim((string) ($profile['name'] ?? ''));
            $location = trim((string) ($profile['location'] ?? ''));
            $summaryText = trim((string) ($profile['summary'] ?? $profile['tagline'] ?? ''));
            $specialties = $this->toTextList($profile['specialties'] ?? []);
            $highlightsList = $this->toTextList($profile['highlights'] ?? []);

            $title = $name !== '' ? $name : 'Entreprise';
            $summary = trim(implode(' ', array_filter([
                $name !== '' ? $name : null,
                $location !== '' ? 'basée à ' . $location : null,
                $summaryText !== '' ? $this->shorten($summaryText, 2) : null,
            ])));
            $highlights = array_slice(array_merge(
                $location !== '' ? ['Localisation: ' . $location] : [],
                $specialties !== [] ? ['Expertises: ' . implode(', ', array_slice($specialties, 0, 4))] : [],
                $highlightsList
            ), 0, 5);
            $keywords = array_slice(array_values(array_unique(array_merge($specialties, $this->extractKeywords($summaryText)))), 0, 8);
        } elseif ($type === 'school') {
            $name = trim((string) ($profile['name'] ?? ''));
            $location = trim((string) ($profile['location'] ?? ''));
            $summaryText = trim((string) ($profile['summary'] ?? $profile['tagline'] ?? ''));
            $specialties = $this->toTextList($profile['specialties'] ?? []);
            $highlightsList = $this->toTextList($profile['highlights'] ?? []);

            $title = $name !== '' ? $name : 'École';
            $summary = trim(implode(' ', array_filter([
                $name !== '' ? $name : null,
                $location !== '' ? 'située à ' . $location : null,
                $summaryText !== '' ? $this->shorten($summaryText, 2) : null,
            ])));
            $highlights = array_slice(array_merge(
                $location !== '' ? ['Campus: ' . $location] : [],
                $specialties !== [] ? ['Spécialités: ' . implode(', ', array_slice($specialties, 0, 4))] : [],
                $highlightsList
            ), 0, 5);
            $keywords = array_slice(array_values(array_unique(array_merge($specialties, $this->extractKeywords($summaryText)))), 0, 8);
        } else {
            $summary = $this->shorten(trim((string) ($profile['summary'] ?? $profile['description'] ?? json_encode($profile, JSON_UNESCAPED_UNICODE))), 2);
            $title = trim((string) ($profile['title'] ?? 'Profil'));
            $highlights = [];
            $keywords = $this->toTextList($profile['keywords'] ?? []);
        }

        return [
            'title' => $title !== '' ? $title : 'Profil',
            'summary' => $summary !== '' ? $summary : 'Résumé indisponible.',
            'highlights' => array_values(array_unique(array_filter($highlights))),
            'keywords' => array_values(array_unique(array_filter($keywords))),
        ];
    }

    /**
     * @param array<string, mixed> $enrichment
     * @param array<string, mixed> $job
     * @return array<string, mixed>
     */
    private function sanitizeEnrichment(array $enrichment, array $job): array
    {
        $fallback = $this->fallbackEnrichment($job);

        $canonicalTitle = trim((string) ($enrichment['canonicalTitle'] ?? $fallback['canonicalTitle']));
        $normalizedTags = $this->harmonizeTags(is_array($enrichment['normalizedTags'] ?? null) ? $enrichment['normalizedTags'] : $fallback['normalizedTags']);
        $keywords = $this->harmonizeTags(is_array($enrichment['keywords'] ?? null) ? $enrichment['keywords'] : $fallback['keywords']);
        $summary = trim((string) ($enrichment['summary'] ?? $fallback['summary']));
        $warnings = is_array($enrichment['warnings'] ?? null) ? array_values(array_filter(array_map('strval', $enrichment['warnings']))) : [];

        return [
            'canonicalTitle' => $canonicalTitle !== '' ? $canonicalTitle : $fallback['canonicalTitle'],
            'normalizedTags' => array_slice($normalizedTags, 0, 8),
            'keywords' => array_slice($keywords, 0, 10),
            'summary' => $summary !== '' ? $summary : $fallback['summary'],
            'warnings' => $warnings,
        ];
    }

    /**
     * @param string $type
     * @param array<string, mixed> $profile
     * @param array<string, mixed> $summary
     * @return array<string, mixed>
     */
    private function sanitizeProfileSummary(string $type, array $profile, array $summary): array
    {
        $fallback = $this->fallbackProfileSummary($type, $profile);

        $title = trim($this->valueToText($summary['title'] ?? $fallback['title']));
        $body = trim($this->valueToText($summary['summary'] ?? $fallback['summary']));
        $highlights = is_array($summary['highlights'] ?? null) ? array_values(array_filter(array_map('strval', $summary['highlights']))) : $fallback['highlights'];
        $keywords = is_array($summary['keywords'] ?? null) ? array_values(array_filter(array_map('strval', $summary['keywords']))) : $fallback['keywords'];

        return [
            'title' => $title !== '' ? $title : $fallback['title'],
            'summary' => $body !== '' ? $body : $fallback['summary'],
            'highlights' => array_slice(array_values(array_unique($highlights)), 0, 5),
            'keywords' => array_slice(array_values(array_unique($keywords)), 0, 8),
        ];
    }

    /**
     * @param array<string, mixed> $job
     * @param array<string, mixed> $profile
     * @param array<string, mixed> $match
     * @return array<string, mixed>
     */
    private function sanitizeJobMatch(array $job, array $profile, array $match): array
    {
        $fallback = $this->fallbackJobMatch($job, $profile);

        $score = max(0, min(100, (int) ($match['score'] ?? $fallback['score'])));
        $level = trim((string) ($match['level'] ?? $fallback['level']));
        $explanation = trim($this->valueToText($match['explanation'] ?? $fallback['explanation']));
        $matchedSkills = $this->toTextList($match['matchedSkills'] ?? $fallback['matchedSkills']);
        $missingSkills = $this->toTextList($match['missingSkills'] ?? $fallback['missingSkills']);

        $criteria = [];
        if (is_array($match['criteria'] ?? null)) {
            foreach ($match['criteria'] as $criterion) {
                if (!is_array($criterion)) {
                    continue;
                }

                $criteria[] = [
                    'label' => trim((string) ($criterion['label'] ?? '')),
                    'score' => max(0, min(100, (int) ($criterion['score'] ?? 0))),
                    'note' => trim($this->valueToText($criterion['note'] ?? '')),
                ];
            }
        }

        if ($criteria === []) {
            $criteria = $fallback['criteria'];
        }

        $warnings = $this->toTextList($match['warnings'] ?? $fallback['warnings']);

        return [
            'score' => $score,
            'level' => $level !== '' ? $level : $fallback['level'],
            'explanation' => $explanation !== '' ? $explanation : $fallback['explanation'],
            'matchedSkills' => array_slice(array_values(array_unique($matchedSkills)), 0, 8),
            'missingSkills' => array_slice(array_values(array_unique($missingSkills)), 0, 8),
            'criteria' => array_slice($criteria, 0, 5),
            'warnings' => array_slice(array_values(array_unique($warnings)), 0, 5),
        ];
    }

    /**
     * @param array<string, mixed> $job
     * @param array<string, mixed> $profile
     * @return array<string, mixed>
     */
    private function fallbackJobMatch(array $job, array $profile): array
    {
        $jobTitle = trim((string) ($job['title'] ?? ''));
        $jobDescription = trim((string) ($job['description'] ?? $job['details']['summary'] ?? $job['details']['description'] ?? ''));
        $jobTags = $this->toTextList($job['tags'] ?? []);
        $companyTags = $this->toTextList($job['company']['specialties'] ?? []);
        $educationRequirements = $this->toTextList($job['details']['educationRequirements'] ?? []);
        $contract = trim((string) ($job['details']['contract'] ?? ''));
        $location = trim((string) ($job['company']['location'] ?? $job['details']['location']['label'] ?? ''));

        $profileHeadline = trim((string) ($profile['headline'] ?? $profile['jobTitle'] ?? ''));
        $profileLocation = trim((string) ($profile['location'] ?? ''));
        $profileSkills = $this->toTextList($profile['skills'] ?? []);
        $profileEducation = $this->toTextList($profile['education'] ?? []);
        $profileBio = trim((string) ($profile['bio'] ?? ''));

        $jobKeywords = array_values(array_unique(array_merge($jobTags, $companyTags, $this->extractKeywords($jobTitle . ' ' . $jobDescription))));
        $profileKeywords = array_values(array_unique(array_merge($profileSkills, $this->extractKeywords($profileHeadline . ' ' . $profileBio))));
        $commonKeywords = array_values(array_intersect(
            array_map([$this, 'normalizeKey'], $profileKeywords),
            array_map([$this, 'normalizeKey'], $jobKeywords)
        ));
        $matchedSkills = $this->toTextList($commonKeywords);
        $missingSkills = array_values(array_diff($this->toTextList($jobKeywords), $matchedSkills));

        $criteria = [
            [
                'label' => 'Compétences communes',
                'score' => min(100, count($matchedSkills) * 20),
                'note' => $matchedSkills !== [] ? implode(', ', array_slice($matchedSkills, 0, 4)) : 'Peu de compétences communes détectées.',
            ],
            [
                'label' => 'Niveau d études',
                'score' => ($educationRequirements === [] || $profileEducation !== [] || ($profile['schoolName'] ?? '') !== '') ? 75 : 45,
                'note' => $educationRequirements !== []
                    ? 'Attendu: ' . implode(', ', array_slice($educationRequirements, 0, 3))
                    : 'Niveau non précisé côté offre.',
            ],
            [
                'label' => 'Localisation',
                'score' => ($location !== '' && $profileLocation !== '' && $this->normalizeKey($location) === $this->normalizeKey($profileLocation)) ? 95 : ($location !== '' || $profileLocation !== '' ? 70 : 50),
                'note' => $location !== '' && $profileLocation !== ''
                    ? 'Offre à ' . $location . ', profil basé à ' . $profileLocation
                    : 'Localisation partiellement renseignée.',
            ],
            [
                'label' => 'Type de contrat',
                'score' => $contract !== '' ? 90 : 60,
                'note' => $contract !== '' ? 'Contrat: ' . $contract : 'Contrat non précisé.',
            ],
            [
                'label' => 'Tags proches',
                'score' => $jobTags !== []
                    ? min(100, count(array_intersect(array_map([$this, 'normalizeKey'], $profileSkills), array_map([$this, 'normalizeKey'], $jobTags))) * 25 + 40)
                    : 50,
                'note' => $jobTags !== [] ? 'Tags de l offre: ' . implode(', ', array_slice($jobTags, 0, 4)) : 'Tags de l offre non disponibles.',
            ],
        ];

        $score = (int) round(array_sum(array_column($criteria, 'score')) / max(1, count($criteria)));
        $level = match (true) {
            $score >= 85 => 'excellent',
            $score >= 70 => 'good',
            $score >= 50 => 'medium',
            default => 'weak',
        };

        $explanationParts = [];
        if ($matchedSkills !== []) {
            $explanationParts[] = 'Compétences communes: ' . implode(', ', array_slice($matchedSkills, 0, 3));
        }
        if ($profileLocation !== '' || $location !== '') {
            $explanationParts[] = 'Localisation: ' . ($profileLocation !== '' ? $profileLocation : 'non renseignée') . ' / ' . ($location !== '' ? $location : 'non renseignée');
        }
        if ($contract !== '') {
            $explanationParts[] = 'Contrat: ' . $contract;
        }

        return [
            'score' => $score,
            'level' => $level,
            'explanation' => $explanationParts !== []
                ? implode('. ', $explanationParts) . '.'
                : 'Le match est évalué à partir des informations disponibles.',
            'matchedSkills' => $matchedSkills,
            'missingSkills' => array_slice($missingSkills, 0, 8),
            'criteria' => $criteria,
            'warnings' => [],
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $jobs
     * @return array<int, array<string, mixed>>
     */
    private function markPotentialDuplicates(array $jobs): array
    {
        $seen = [];

        foreach ($jobs as $index => $job) {
            $signature = $this->duplicateSignature($job);

            if ($signature === '') {
                continue;
            }

            if (isset($seen[$signature])) {
                $jobs[$index]['enrichment']['duplicateOf'] = $seen[$signature];
                $jobs[$index]['enrichment']['duplicateSignature'] = $signature;
                continue;
            }

            $seen[$signature] = $job['id'] ?? null;
            $jobs[$index]['enrichment']['duplicateOf'] = null;
            $jobs[$index]['enrichment']['duplicateSignature'] = $signature;
        }

        return $jobs;
    }

    /**
     * @param array<string, mixed> $job
     * @return string
     */
    private function duplicateSignature(array $job): string
    {
        $title = $this->normalizeKey((string) ($job['enrichment']['canonicalTitle'] ?? $job['title'] ?? ''));
        $company = $this->normalizeKey((string) ($job['company']['name'] ?? $job['details']['company']['name'] ?? ''));
        $location = $this->normalizeKey((string) ($job['company']['location'] ?? $job['details']['location']['label'] ?? ''));

        if ($title === '' && $company === '') {
            return '';
        }

        return implode('|', [$title, $company, $location]);
    }

    /**
     * @param string $title
     * @return string
     */
    private function cleanTitle(string $title): string
    {
        $cleaned = preg_replace('/\b(h\/f|hf|h-f|f\/h)\b/i', '', $title) ?? $title;
        $cleaned = preg_replace('/\s*[-|]\s*$/', '', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/\s*[-|]\s*(alternance|stage)\b/i', '', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/\s+/', ' ', trim($cleaned)) ?? trim($title);

        return $cleaned !== '' ? $cleaned : $title;
    }

    /**
     * @param array<int, string> $tags
     * @return array<int, string>
     */
    private function harmonizeTags(array $tags): array
    {
        $aliases = [
            'front end' => 'Frontend',
            'front-end' => 'Frontend',
            'frontend' => 'Frontend',
            'back end' => 'Backend',
            'back-end' => 'Backend',
            'backend' => 'Backend',
            'full stack' => 'Full Stack',
            'full-stack' => 'Full Stack',
            'node' => 'Node.js',
            'nodejs' => 'Node.js',
            'node js' => 'Node.js',
            'react js' => 'React',
            'reactjs' => 'React',
            'recrutement' => 'Recrutement',
            'rh' => 'RH',
            'ressources humaines' => 'RH',
            'alternance' => 'Alternance',
            'stage' => 'Stage',
            'communication' => 'Communication',
            'marketing' => 'Marketing',
            'design' => 'Design',
            'ux' => 'UX',
            'ui' => 'UI',
        ];

        $normalized = [];

        foreach ($tags as $tag) {
            $value = $this->normalizeTagValue((string) $tag);

            if ($value === '' || preg_match('/\d/u', $value)) {
                continue;
            }

            $key = $this->normalizeKey($value);
            $normalized[] = $aliases[$key] ?? $this->titleCaseTag($value);
        }

        return array_values(array_unique($normalized));
    }

    /**
     * @param string $text
     * @return array<int, string>
     */
    private function extractKeywords(string $text): array
    {
        $text = $this->normalizeWhitespace($text);
        if ($text === '') {
            return [];
        }

        $stopWords = array_flip([
            'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'en', 'sur', 'pour', 'avec', 'dans',
            'the', 'a', 'an', 'to', 'of', 'and', 'or', 'by', 'for', 'with', 'from',
            'h', 'f', 'hf', 'h/f', 'alternance', 'stage', 'poste', 'offre', 'job', 'entreprise',
            'ans', 'mois',
        ]);

        preg_match_all('/[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9+#.-]{1,}/u', $text, $matches);
        $words = $matches[0] ?? [];
        $counts = [];

        foreach ($words as $word) {
            $key = $this->normalizeKey($word);

            if ($key === '' || isset($stopWords[$key]) || mb_strlen($key) < 3 || preg_match('/\d/u', $key)) {
                continue;
            }

            $counts[$key] = ($counts[$key] ?? 0) + 1;
        }

        arsort($counts);
        $keywords = [];

        foreach (array_keys($counts) as $key) {
            $keywords[] = $this->titleCaseTag(str_replace(['node js', 'front end', 'back end'], ['Node.js', 'Frontend', 'Backend'], $key));

            if (count($keywords) >= 8) {
                break;
            }
        }

        return array_values(array_unique($keywords));
    }

    /**
     * @param string $text
     * @return string
     */
    private function compactText(string $text): string
    {
        return $this->normalizeWhitespace(str_replace(["\r", "\n"], ' ', strip_tags($text)));
    }

    /**
     * @param string $text
     * @return string
     */
    private function shorten(string $text, int $sentences = 2): string
    {
        $sentences = max(1, $sentences);
        preg_match_all('/[^.!?]+[.!?]?/u', $this->normalizeWhitespace($text), $matches);
        $parts = array_slice(array_filter(array_map('trim', $matches[0] ?? [])), 0, $sentences);

        if ($parts === []) {
            return $this->truncate($text, 220);
        }

        return implode(' ', $parts);
    }

    /**
     * @param string $text
     * @return string
     */
    private function truncate(string $text, int $length): string
    {
        $text = $this->normalizeWhitespace($text);

        if (mb_strlen($text) <= $length) {
            return $text;
        }

        return rtrim(mb_substr($text, 0, max(0, $length - 1))) . '…';
    }

    /**
     * @param mixed $value
     * @return string
     */
    private function normalizeTagValue(mixed $value): string
    {
        return $this->normalizeWhitespace((string) $value);
    }

    /**
     * @param string $value
     * @return string
     */
    private function normalizeKey(string $value): string
    {
        $value = mb_strtolower($this->normalizeWhitespace($value));
        $value = preg_replace('/[^\pL\pN+#. ]+/u', ' ', $value) ?? $value;
        $value = preg_replace('/\s+/', ' ', trim($value)) ?? trim($value);

        return $value;
    }

    /**
     * @param string $value
     * @return string
     */
    private function titleCaseTag(string $value): string
    {
        $value = $this->normalizeWhitespace($value);

        if ($value === '') {
            return $value;
        }

        $value = mb_convert_case(mb_strtolower($value), MB_CASE_TITLE, 'UTF-8');

        return str_replace(['. Js', 'Ui', 'Ux', 'Rh'], ['.js', 'UI', 'UX', 'RH'], $value);
    }

    /**
     * @param mixed $value
     * @return string
     */
    private function valueToText(mixed $value): string
    {
        if (is_string($value) || is_numeric($value)) {
            return (string) $value;
        }

        if (is_bool($value) || $value === null) {
            return '';
        }

        if (is_array($value)) {
            $parts = [];

            array_walk_recursive($value, static function ($item) use (&$parts): void {
                if (is_string($item) || is_numeric($item)) {
                    $parts[] = (string) $item;
                }
            });

            return implode(' ', array_filter($parts));
        }

        if (is_object($value) && method_exists($value, '__toString')) {
            return (string) $value;
        }

        return '';
    }

    /**
     * @param mixed $values
     * @return array<int, string>
     */
    private function toTextList(mixed $values): array
    {
        if (!is_array($values)) {
            $text = trim($this->valueToText($values));
            return $text !== '' ? [$text] : [];
        }

        $items = [];

        array_walk_recursive($values, static function ($item) use (&$items): void {
            if (is_string($item) || is_numeric($item)) {
                $text = trim((string) $item);
                if ($text !== '') {
                    $items[] = $text;
                }
            }
        });

        return array_values(array_unique($items));
    }

    /**
     * @param string $text
     * @return string
     */
    private function normalizeWhitespace(string $text): string
    {
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/\s+/u', ' ', trim($text)) ?? trim($text);

        return $text;
    }

    /**
     * @param string $url
     * @param string $payload
     * @return array<string, mixed>|null
     */
    private function postJson(string $url, string $payload): ?array
    {
        $ch = curl_init($url);

        if ($ch === false) {
            return null;
        }

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 12,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
            ],
        ]);

        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if (!is_string($raw) || $raw === '' || $status < 200 || $status >= 300) {
            return null;
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * @param string $json
     * @return array<string, mixed>|null
     */
    private function decodeJsonObject(string $json): ?array
    {
        $decoded = json_decode($json, true);

        if (is_array($decoded)) {
            return $decoded;
        }

        $trimmed = trim($json);
        $trimmed = preg_replace('/^```json\s*/i', '', $trimmed) ?? $trimmed;
        $trimmed = preg_replace('/^```\s*/i', '', $trimmed) ?? $trimmed;
        $trimmed = preg_replace('/\s*```$/', '', $trimmed) ?? $trimmed;
        $decoded = json_decode($trimmed, true);

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * @param string $signature
     * @return array<string, mixed>|null
     */
    private function readCache(string $signature): ?array
    {
        $cache = $this->loadCache();

        if (!isset($cache['items'][$signature]) || !is_array($cache['items'][$signature])) {
            return null;
        }

        return $cache['items'][$signature];
    }

    /**
     * @param string $signature
     * @param array<string, mixed> $enrichment
     * @return void
     */
    private function writeCache(string $signature, array $enrichment): void
    {
        $cache = $this->loadCache();
        $cache['schemaVersion'] = self::CACHE_SCHEMA_VERSION;
        $cache['fetchedAt'] = gmdate(DATE_ATOM);
        $cache['items'][$signature] = $enrichment;

        $cacheFile = $this->cacheFile();
        @file_put_contents($cacheFile, json_encode($cache, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    /**
     * @return array<string, mixed>
     */
    private function loadCache(): array
    {
        $cacheFile = $this->cacheFile();

        if (!is_file($cacheFile)) {
            return [
                'schemaVersion' => self::CACHE_SCHEMA_VERSION,
                'fetchedAt' => null,
                'items' => [],
            ];
        }

        $decoded = json_decode((string) file_get_contents($cacheFile), true);

        if (!is_array($decoded) || (int) ($decoded['schemaVersion'] ?? 0) !== self::CACHE_SCHEMA_VERSION) {
            return [
                'schemaVersion' => self::CACHE_SCHEMA_VERSION,
                'fetchedAt' => null,
                'items' => [],
            ];
        }

        if (!isset($decoded['items']) || !is_array($decoded['items'])) {
            $decoded['items'] = [];
        }

        return $decoded;
    }

    /**
     * @return string
     */
    private function cacheFile(): string
    {
        return $this->projectDir . '/var/ai-enrichment-cache.json';
    }
}
