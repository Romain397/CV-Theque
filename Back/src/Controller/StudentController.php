<?php

namespace App\Controller;

use App\Entity\School;
use App\Entity\Company;
use App\Entity\Student;
use App\Repository\StudentRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Attribute\Route;

final class StudentController extends AbstractController
{
    #[Route('/students', name: 'students_index', methods: ['GET'])]
    public function index(StudentRepository $repository): JsonResponse
    {
        $students = $repository->findBy([], ['id' => 'DESC']);

        return $this->json(array_map(
            fn (Student $student): array => $this->formatStudent($student),
            $students
        ));
    }

    #[Route('/students', name: 'students_create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = $this->getRequestData($request);
        $student = new Student();

        $this->hydrateStudent($student, $data, $em);

        $em->persist($student);
        $em->flush();

        return $this->json($this->formatStudent($student), 201);
    }

    #[Route('/students/{id}', name: 'students_update', methods: ['PUT'])]
    public function update(Student $student, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = $this->getRequestData($request);

        $this->hydrateStudent($student, $data, $em);
        $em->flush();

        return $this->json($this->formatStudent($student));
    }

    #[Route('/students/{id}', name: 'students_delete', methods: ['DELETE'])]
    public function delete(Student $student, EntityManagerInterface $em): JsonResponse
    {
        $em->remove($student);
        $em->flush();

        return $this->json([
            'message' => 'Student deleted',
        ]);
    }

    private function getRequestData(Request $request): array
    {
        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            throw new BadRequestHttpException('Invalid JSON payload.');
        }

        return $data;
    }

    private function hydrateStudent(Student $student, array $data, EntityManagerInterface $em): void
    {
        foreach (['firstName', 'lastName', 'age', 'jobTitle', 'location'] as $field) {
            if (!array_key_exists($field, $data)) {
                throw new BadRequestHttpException(sprintf('Missing field "%s".', $field));
            }
        }

        $student
            ->setFirstName((string) $data['firstName'])
            ->setLastName((string) $data['lastName'])
            ->setAge((int) $data['age'])
            ->setJobTitle((string) $data['jobTitle'])
            ->setLocation((string) $data['location']);

        if (array_key_exists('schoolId', $data)) {
            $schoolId = $data['schoolId'];
            $student->setSchool(null);

            if ($schoolId !== null && $schoolId !== '') {
                $school = $em->getRepository(School::class)->find((int) $schoolId);

                if (!$school) {
                    throw new BadRequestHttpException('Unknown schoolId.');
                }

                $student->setSchool($school);
            }
        }

        if (array_key_exists('companyId', $data)) {
            $companyId = $data['companyId'];
            $student->setCompany(null);

            if ($companyId !== null && $companyId !== '') {
                $company = $em->getRepository(Company::class)->find((int) $companyId);

                if (!$company) {
                    throw new BadRequestHttpException('Unknown companyId.');
                }

                $student->setCompany($company);
            }
        }

        if (array_key_exists('skills', $data) || array_key_exists('tags', $data)) {
            $student->setSkills($this->normalizeSkills($data['skills'] ?? $data['tags']));
        }
    }

    private function formatStudent(Student $student): array
    {
        return [
            'id' => $student->getId(),
            'firstName' => $student->getFirstName(),
            'lastName' => $student->getLastName(),
            'age' => $student->getAge(),
            'jobTitle' => $student->getJobTitle(),
            'location' => $student->getLocation(),
            'skills' => array_values($student->getSkills()),
            'school' => $student->getSchool() ? [
                'id' => $student->getSchool()->getId(),
                'name' => $student->getSchool()->getName(),
                'location' => $student->getSchool()->getLocation(),
            ] : null,
            'company' => $student->getCompany() ? [
                'id' => $student->getCompany()->getId(),
                'name' => $student->getCompany()->getName(),
                'location' => $student->getCompany()->getLocation(),
            ] : null,
        ];
    }

    private function normalizeSkills(array $skills): array
    {
        return array_values(array_filter(array_map(static function ($skill): ?array {
            if (is_string($skill)) {
                $name = trim($skill);

                return $name !== '' ? ['name' => $name, 'level' => 'Intermédiaire'] : null;
            }

            if (!is_array($skill)) {
                return null;
            }

            $name = trim((string) ($skill['name'] ?? ''));

            if ($name === '') {
                return null;
            }

            $level = trim((string) ($skill['level'] ?? 'Intermédiaire'));

            return [
                'name' => $name,
                'level' => $level !== '' ? $level : 'Intermédiaire',
            ];
        }, $skills)));
    }
}
