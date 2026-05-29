<?php

namespace App\Controller;

use App\Entity\School;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Attribute\Route;

final class SchoolController extends AbstractController
{
    #[Route('/schools', name: 'schools_index', methods: ['GET'])]
    public function index(EntityManagerInterface $em): JsonResponse
    {
        $schools = $em->getRepository(School::class)->findBy([], ['id' => 'DESC']);

        $data = array_map(fn(School $s) => $this->formatSchool($s), $schools);

        return $this->json($data);
    }

    #[Route('/schools/{id}', name: 'schools_update', methods: ['PUT'])]
    public function update(School $school, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = $this->getRequestData($request);
        $this->hydrateSchool($school, $data);

        $em->flush();

        return $this->json($this->formatSchool($school));
    }

    private function getRequestData(Request $request): array
    {
        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            throw new BadRequestHttpException('Invalid JSON payload.');
        }

        return $data;
    }

    private function hydrateSchool(School $school, array $data): void
    {
        if (array_key_exists('name', $data)) {
            $school->setName((string) $data['name']);
        }

        if (array_key_exists('location', $data)) {
            $school->setLocation($data['location'] === null ? null : (string) $data['location']);
        }

        if (array_key_exists('specialties', $data) || array_key_exists('tags', $data)) {
            $school->setSpecialties($this->normalizeTags($data['specialties'] ?? $data['tags']));
        }
    }

    private function formatSchool(School $school): array
    {
        return [
            'id' => $school->getId(),
            'name' => $school->getName(),
            'location' => $school->getLocation(),
            'specialties' => array_values($school->getSpecialties()),
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
