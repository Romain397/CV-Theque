<?php

namespace App\Controller;

use App\Entity\JobOffer;
use App\Entity\Company;
use App\Service\AiEnrichmentService;
use App\Service\HelloworkOfferScraper;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Attribute\Route;

final class JobController extends AbstractController
{
    #[Route('/jobs', name: 'jobs_index', methods: ['GET'])]
    public function index(EntityManagerInterface $em, HelloworkOfferScraper $helloworkOfferScraper, AiEnrichmentService $aiEnrichmentService): JsonResponse
    {
        $this->syncSingleAccountCompanyJobs($em);
        $jobs = $em->getRepository(JobOffer::class)->findBy([], ['id' => 'DESC']);
        $helloworkJobs = $helloworkOfferScraper->fetchLatestOffers(5);
        $localJobs = array_map(
            fn (JobOffer $job): array => $this->formatJob($job, $em),
            $jobs
        );

        return $this->json($aiEnrichmentService->enrichJobs(array_merge(
            $helloworkJobs,
            $localJobs
        ), false));
    }

    #[Route('/jobs', name: 'jobs_create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em, AiEnrichmentService $aiEnrichmentService): JsonResponse
    {
        $data = $this->getRequestData($request);
        $job = new JobOffer();
        $this->hydrateJob($job, $data, $em);

        if (!$job->getTitle()) {
            throw new BadRequestHttpException('Missing title.');
        }

        if (!$job->getCompany()) {
            throw new BadRequestHttpException('Missing companyId.');
        }

        $em->persist($job);
        $em->flush();

        return $this->json($aiEnrichmentService->enrichJob($this->formatJob($job, $em), false), 201);
    }

    #[Route('/jobs/{id}', name: 'jobs_update', methods: ['PUT'])]
    public function update(JobOffer $job, Request $request, EntityManagerInterface $em, AiEnrichmentService $aiEnrichmentService): JsonResponse
    {
        $data = $this->getRequestData($request);
        $this->hydrateJob($job, $data, $em);

        $em->flush();

        return $this->json($aiEnrichmentService->enrichJob($this->formatJob($job, $em), false));
    }

    #[Route('/jobs/{id}', name: 'jobs_delete', methods: ['DELETE'])]
    public function delete(JobOffer $job, EntityManagerInterface $em): JsonResponse
    {
        $em->remove($job);
        $em->flush();

        return $this->json(['ok' => true]);
    }

    private function getRequestData(Request $request): array
    {
        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            throw new BadRequestHttpException('Invalid JSON payload.');
        }

        return $data;
    }

    private function hydrateJob(JobOffer $job, array $data, EntityManagerInterface $em): void
    {
        if (array_key_exists('title', $data)) {
            $job->setTitle((string) $data['title']);
        }

        if (array_key_exists('description', $data)) {
            $job->setDescription($data['description'] === null ? null : (string) $data['description']);
        }

        if (array_key_exists('companyId', $data)) {
            $companyId = $data['companyId'];
            $company = null;

            if ($companyId !== null && $companyId !== '') {
                $company = $this->resolveCompany($em, (int) $companyId);

                if (!$company) {
                    throw new BadRequestHttpException('Unknown companyId.');
                }
            }

            if ($company instanceof Company) {
                $job->setCompany($company);
            }
        }

        if (array_key_exists('tags', $data)) {
            $job->setTags($this->normalizeTags($data['tags']));
        }
    }

    private function resolveCompany(EntityManagerInterface $em, int $id): ?Company
    {
        $accountCompany = $this->ensureCompanyForAccount($em, $id);
        if ($accountCompany instanceof Company) {
            return $accountCompany;
        }

        return $em->getRepository(Company::class)->find($id);
    }

    private function ensureCompanyForAccount(EntityManagerInterface $em, int $accountId): ?Company
    {
        $connection = $em->getConnection();
        $user = $connection->fetchAssociative('SELECT id,name,location,skills,profileJson FROM users WHERE id = ? AND role = ?', [$accountId, 'company']);
        if (!$user) {
            return null;
        }

        $name = trim((string) ($user['name'] ?? ''));
        if ($name === '') {
            return null;
        }

        $profile = json_decode((string) ($user['profileJson'] ?? '{}'), true) ?: [];
        $skills = json_decode((string) ($user['skills'] ?? '[]'), true) ?: [];
        if (isset($profile['skills']) && is_array($profile['skills'])) {
            $skills = $profile['skills'];
        }

        $location = trim((string) ($profile['location'] ?? $user['location'] ?? ''));
        $locations = isset($profile['locations']) && is_array($profile['locations']) ? $profile['locations'] : [];
        if ($location === '' && $locations) {
            $location = trim((string) $locations[0]);
        }

        $company = $em->getRepository(Company::class)->findOneBy(['name' => $name]);
        if (!$company) {
            $company = new Company();
            $company->setName($name);
            $em->persist($company);
        }

        $company->setLocation($location !== '' ? $location : $company->getLocation());
        if (is_array($skills) && $skills) {
            $company->setSpecialties($this->normalizeTags($skills));
        }

        return $company;
    }

    private function syncSingleAccountCompanyJobs(EntityManagerInterface $em): void
    {
        $connection = $em->getConnection();
        $companyAccounts = $connection->fetchAllAssociative('SELECT id FROM users WHERE role = ? ORDER BY id ASC', ['company']);
        if (count($companyAccounts) !== 1) {
            return;
        }

        $company = $this->ensureCompanyForAccount($em, (int) $companyAccounts[0]['id']);
        if (!$company instanceof Company) {
            return;
        }

        $em->flush();
        $connection->executeStatement('UPDATE job_offer SET company_id = ?', [$company->getId()]);
    }

    private function formatJob(JobOffer $job, ?EntityManagerInterface $em = null): array
    {
        $company = $job->getCompany();
        $publicCompanyId = $company?->getId();

        if ($em && $company?->getName()) {
            $accountId = $em->getConnection()->fetchOne(
                'SELECT id FROM users WHERE role = ? AND LOWER(name) = LOWER(?) LIMIT 1',
                ['company', $company->getName()]
            );
            if ($accountId) {
                $publicCompanyId = (int) $accountId;
            }
        }

        return [
            'id' => $job->getId(),
            'title' => $job->getTitle(),
            'description' => $job->getDescription(),
            'tags' => array_values($job->getTags()),
            'source' => 'Local',
            'company' => $company ? [
                'id' => $publicCompanyId,
                'name' => $company->getName(),
                'location' => $company->getLocation(),
                'specialties' => array_values($company->getSpecialties()),
            ] : null,
            'externalUrl' => null,
            'publishedAt' => null,
            'details' => $this->buildLocalJobDetails($job),
        ];
    }

    private function buildLocalJobDetails(JobOffer $job): array
    {
        $description = trim((string) $job->getDescription());
        if ($description === '') {
            return [];
        }

        $sections = [];
        $currentTitle = null;
        $currentBody = [];
        $lines = preg_split('/\R/', $description) ?: [];
        $summary = '';

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '') {
                continue;
            }

            if (preg_match('/^([A-ZÀ-Ù][^:]{2,60})\s*:\s*(.*)$/u', $trimmed, $matches)) {
                if ($currentTitle !== null) {
                    $sections[] = [
                        'title' => $currentTitle,
                        'body' => trim(implode("\n", $currentBody)),
                    ];
                }

                $currentTitle = trim($matches[1]);
                $currentBody = [];
                if (trim($matches[2]) !== '') {
                    $currentBody[] = trim($matches[2]);
                }
                continue;
            }

            if ($currentTitle === null && $summary === '') {
                $summary = $trimmed;
            }

            if ($currentTitle !== null) {
                $currentBody[] = $trimmed;
            }
        }

        if ($currentTitle !== null) {
            $sections[] = [
                'title' => $currentTitle,
                'body' => trim(implode("\n", $currentBody)),
            ];
        }

        return [
            'summary' => $summary !== '' ? $summary : $description,
            'sections' => array_values(array_filter($sections, fn (array $section): bool => $section['body'] !== '')),
        ];
    }

    private function normalizeTags(array $tags): array
    {
        return array_values(array_filter(array_map(static function ($tag): ?string {
            $value = trim((string) $tag);

            return $value === '' ? null : $value;
        }, $tags)));
    }
}
