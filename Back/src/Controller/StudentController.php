<?php

namespace App\Controller;

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

        $this->hydrateStudent($student, $data);

        $em->persist($student);
        $em->flush();

        return $this->json($this->formatStudent($student), 201);
    }

    #[Route('/students/{id}', name: 'students_update', methods: ['PUT'])]
    public function update(Student $student, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = $this->getRequestData($request);

        $this->hydrateStudent($student, $data);
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

    private function hydrateStudent(Student $student, array $data): void
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
        ];
    }
}
