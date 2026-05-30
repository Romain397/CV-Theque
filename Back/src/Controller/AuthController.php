<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

final class AuthController extends AbstractController
{
    private function dbFile(): string
    {
        return __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'var' . DIRECTORY_SEPARATOR . 'cvtheque.db';
    }

    private function getDb(): \PDO
    {
        $dsn = 'sqlite:' . $this->dbFile();
        $opts = [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION];
        return new \PDO($dsn, null, null, $opts);
    }

    private function getRequestData(Request $request): array
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            throw new BadRequestHttpException('Invalid JSON payload.');
        }
        return $data;
    }

    #[Route('/login', name: 'api_login', methods: ['POST'])]
    public function login(Request $request): JsonResponse
    {
        $data = $this->getRequestData($request);

        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;

        if (!$email || !$password) {
            throw new BadRequestHttpException('Missing credentials.');
        }

        $db = $this->getDb();
        $stmt = $db->prepare('SELECT id,name,email,role,approved,approvedAt,approvedBy FROM users WHERE email = ? AND password = ?');
        $stmt->execute([$email, $password]);
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$user) {
            return $this->json(['error' => 'Invalid credentials'], 401, ['Access-Control-Allow-Origin' => '*','Access-Control-Allow-Headers'=>'Content-Type','Access-Control-Allow-Methods'=>'POST,OPTIONS']);
        }

        if (isset($user['approved']) && !$user['approved']) {
            return $this->json(['error' => 'Account pending approval'], 403, ['Access-Control-Allow-Origin' => '*','Access-Control-Allow-Headers'=>'Content-Type','Access-Control-Allow-Methods'=>'POST,OPTIONS']);
        }

        $token = base64_encode($user['id'] . ':' . $user['email'] . ':' . time());

        return $this->json(['user' => $user, 'token' => $token], 200, ['Access-Control-Allow-Origin' => '*','Access-Control-Allow-Headers'=>'Content-Type','Access-Control-Allow-Methods'=>'POST,OPTIONS']);
    }

    #[Route('/register', name: 'api_register', methods: ['POST'])]
    public function register(Request $request): JsonResponse
    {
        $data = $this->getRequestData($request);
        $name = $data['name'] ?? ($data['firstName'] ?? 'Utilisateur');
        $email = $data['email'] ?? null;
        $password = $data['password'] ?? 'changeme';
        $role = $data['role'] ?? 'student';

        if (!$email) {
            throw new BadRequestHttpException('Missing email');
        }

        $db = $this->getDb();

        // Prevent duplicate email
        $exists = $db->prepare('SELECT id FROM users WHERE email = ?');
        $exists->execute([$email]);
        if ($exists->fetch()) {
            return $this->json(['error' => 'Email already used'], 400, ['Access-Control-Allow-Origin' => '*','Access-Control-Allow-Headers'=>'Content-Type','Access-Control-Allow-Methods'=>'POST,OPTIONS']);
        }

        $stmt = $db->prepare('INSERT INTO users (name,email,password,role,approved,approvedAt,approvedBy) VALUES (?,?,?,?,?,?,?)');
        $isBootstrapAdmin = ($role === 'admin') && !$db->query("SELECT id FROM users WHERE role='admin' AND approved=1")->fetch();
        $approved = $isBootstrapAdmin ? 1 : 0;
        $approvedAt = $isBootstrapAdmin ? (new \DateTime())->format('Y-m-d H:i:s') : null;
        $approvedBy = $isBootstrapAdmin ? 'system' : null;

        $stmt->execute([$name, $email, $password, $role, $approved, $approvedAt, $approvedBy]);
        $id = $db->lastInsertId();

        $user = $db->query('SELECT id,name,email,role,approved,approvedAt,approvedBy FROM users WHERE id=' . (int) $id)->fetch(\PDO::FETCH_ASSOC);

        if ($approved) {
            $token = base64_encode($user['id'] . ':' . $user['email'] . ':' . time());
            return $this->json(['user' => $user, 'token' => $token], 201, ['Access-Control-Allow-Origin' => '*','Access-Control-Allow-Headers'=>'Content-Type','Access-Control-Allow-Methods'=>'POST,OPTIONS']);
        }

        return $this->json(['user' => $user, 'pending' => true], 201, ['Access-Control-Allow-Origin' => '*','Access-Control-Allow-Headers'=>'Content-Type','Access-Control-Allow-Methods'=>'POST,OPTIONS']);
    }

    #[Route('/users', name: 'users_list', methods: ['GET'])]
    public function listUsers(): JsonResponse
    {
        $db = $this->getDb();
        $rows = $db->query('SELECT id,name,email,role,approved,approvedAt,approvedBy FROM users ORDER BY id DESC')->fetchAll(\PDO::FETCH_ASSOC);
        return $this->json($rows, 200, ['Access-Control-Allow-Origin' => '*','Access-Control-Allow-Headers'=>'Content-Type','Access-Control-Allow-Methods'=>'GET,OPTIONS']);
    }

    #[Route('/users/{id}', name: 'user_get', methods: ['GET'])]
    public function getUser(int $id): JsonResponse
    {
        $db = $this->getDb();
        $stmt = $db->prepare('SELECT id,name,email,role,approved,approvedAt,approvedBy FROM users WHERE id = ?');
        $stmt->execute([(int) $id]);
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$user) return $this->json(['error' => 'Not found'], 404, ['Access-Control-Allow-Origin' => '*','Access-Control-Allow-Headers'=>'Content-Type','Access-Control-Allow-Methods'=>'GET,OPTIONS']);
        return $this->json($user, 200, ['Access-Control-Allow-Origin' => '*','Access-Control-Allow-Headers'=>'Content-Type','Access-Control-Allow-Methods'=>'GET,OPTIONS']);
    }

    #[Route('/users/{id}', name: 'user_update', methods: ['PUT'])]
    public function updateUser(int $id, Request $request): JsonResponse
    {
        $data = $this->getRequestData($request);
        $db = $this->getDb();

        // build update set
        $fields = [];
        $params = [];
        foreach (['name','email','password','role','approved','approvedAt','approvedBy'] as $f) {
            if (array_key_exists($f, $data)) {
                $fields[] = "$f = ?";
                $params[] = $data[$f];
            }
        }

        if (count($fields) === 0) {
            return $this->json(['error' => 'No fields to update'], 400, ['Access-Control-Allow-Origin' => '*','Access-Control-Allow-Headers'=>'Content-Type','Access-Control-Allow-Methods'=>'PUT,OPTIONS']);
        }

        $params[] = (int) $id;
        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        return $this->getUser($id);
    }

    #[Route('/users/{id}', name: 'user_delete', methods: ['DELETE'])]
    public function deleteUser(int $id): JsonResponse
    {
        $db = $this->getDb();
        $stmt = $db->prepare('DELETE FROM users WHERE id = ?');
        $stmt->execute([(int) $id]);
        return $this->json(['message' => 'deleted'], 200, ['Access-Control-Allow-Origin' => '*','Access-Control-Allow-Headers'=>'Content-Type','Access-Control-Allow-Methods'=>'DELETE,OPTIONS']);
    }

    // Global OPTIONS handler for CORS preflight
    #[Route('/{any}', name: 'cors_options', requirements: ['any' => '.*'], methods: ['OPTIONS'])]
    public function options(): JsonResponse
    {
        return new JsonResponse(null, 200, ['Access-Control-Allow-Origin' => '*', 'Access-Control-Allow-Headers' => 'Content-Type', 'Access-Control-Allow-Methods' => 'GET,POST,PUT,DELETE,OPTIONS']);
    }
}
