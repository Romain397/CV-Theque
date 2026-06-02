<?php

namespace App\Controller;

use App\Service\AiEnrichmentService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Throwable;

final class AiController extends AbstractController
{
    #[Route('/ai/profile-summary', name: 'ai_profile_summary', methods: ['POST'])]
    public function profileSummary(Request $request, AiEnrichmentService $aiEnrichmentService): JsonResponse
    {
        try {
            $data = $this->getRequestData($request);
            $type = isset($data['type']) ? (string) $data['type'] : 'profile';
            $profile = $data['profile'] ?? null;

            if (!is_array($profile)) {
                throw new BadRequestHttpException('Missing profile payload.');
            }

            return $this->json($aiEnrichmentService->summarizeProfile($type, $profile));
        } catch (Throwable $throwable) {
            return $this->json([
                'error' => 'Impossible de générer le résumé IA.',
                'detail' => $throwable->getMessage(),
                'type' => $throwable::class,
            ], $throwable instanceof BadRequestHttpException ? 400 : 500);
        }
    }

    #[Route('/ai/job-match', name: 'ai_job_match', methods: ['POST'])]
    public function jobMatch(Request $request, AiEnrichmentService $aiEnrichmentService): JsonResponse
    {
        try {
            $data = $this->getRequestData($request);
            $job = $data['job'] ?? null;
            $profile = $data['profile'] ?? null;

            if (!is_array($job)) {
                throw new BadRequestHttpException('Missing job payload.');
            }

            if (!is_array($profile)) {
                throw new BadRequestHttpException('Missing profile payload.');
            }

            return $this->json($aiEnrichmentService->matchJobProfile($job, $profile));
        } catch (Throwable $throwable) {
            return $this->json([
                'error' => 'Impossible de calculer le matching IA.',
                'detail' => $throwable->getMessage(),
                'type' => $throwable::class,
            ], $throwable instanceof BadRequestHttpException ? 400 : 500);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function getRequestData(Request $request): array
    {
        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            throw new BadRequestHttpException('Invalid JSON payload.');
        }

        return $data;
    }
}
