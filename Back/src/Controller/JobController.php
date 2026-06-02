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
        $jobs = $em->getRepository(JobOffer::class)->findBy([], ['id' => 'DESC']);
        $helloworkJobs = $helloworkOfferScraper->fetchLatestOffers(5);
        $localJobs = array_map(
            fn (JobOffer $job): array => $this->formatJob($job),
            $jobs
        );

        return $this->json($aiEnrichmentService->enrichJobs(array_merge(
            $helloworkJobs,
            $localJobs
        ), false));
    }

    #[Route('/jobs/{id}', name: 'jobs_update', methods: ['PUT'])]
    public function update(JobOffer $job, Request $request, EntityManagerInterface $em, AiEnrichmentService $aiEnrichmentService): JsonResponse
    {
        $data = $this->getRequestData($request);
        $this->hydrateJob($job, $data, $em);

        $em->flush();

        return $this->json($aiEnrichmentService->enrichJob($this->formatJob($job), false));
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
                $company = $em->getRepository(Company::class)->find((int) $companyId);

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

    private function formatJob(JobOffer $job): array
    {
        return [
            'id' => $job->getId(),
            'title' => $job->getTitle(),
            'description' => $job->getDescription(),
            'tags' => array_values($job->getTags()),
            'source' => 'Local',
            'company' => $job->getCompany() ? [
                'id' => $job->getCompany()->getId(),
                'name' => $job->getCompany()->getName(),
                'location' => $job->getCompany()->getLocation(),
                'specialties' => array_values($job->getCompany()->getSpecialties()),
            ] : null,
            'externalUrl' => null,
            'publishedAt' => null,
            'details' => [],
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
