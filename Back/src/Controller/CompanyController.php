<?php

namespace App\Controller;

use App\Entity\Company;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Attribute\Route;

final class CompanyController extends AbstractController
{
    #[Route('/companies', name: 'companies_index', methods: ['GET'])]
    public function index(EntityManagerInterface $em): JsonResponse
    {
        $companies = $em->getRepository(Company::class)->findBy([], ['id' => 'DESC']);

        return $this->json(array_map(
            fn (Company $company): array => $this->formatCompany($company),
            $companies
        ));
    }

    #[Route('/companies/{id}', name: 'companies_update', methods: ['PUT'])]
    public function update(Company $company, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = $this->getRequestData($request);
        $this->hydrateCompany($company, $data);

        $em->flush();

        return $this->json($this->formatCompany($company));
    }

    private function getRequestData(Request $request): array
    {
        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            throw new BadRequestHttpException('Invalid JSON payload.');
        }

        return $data;
    }

    private function hydrateCompany(Company $company, array $data): void
    {
        if (array_key_exists('name', $data)) {
            $company->setName((string) $data['name']);
        }

        if (array_key_exists('location', $data)) {
            $company->setLocation($data['location'] === null ? null : (string) $data['location']);
        }

        if (array_key_exists('specialties', $data) || array_key_exists('tags', $data)) {
            $company->setSpecialties($this->normalizeTags($data['specialties'] ?? $data['tags']));
        }
    }

    private function formatCompany(Company $company): array
    {
        return [
            'id' => $company->getId(),
            'name' => $company->getName(),
            'location' => $company->getLocation(),
            'specialties' => array_values($company->getSpecialties()),
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
