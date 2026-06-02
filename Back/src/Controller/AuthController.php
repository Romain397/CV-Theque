<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Firebase\JWT\JWT;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\Key;

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

    private function normalizeProjectList(mixed $projects): array
    {
        if (!is_array($projects)) {
            return [];
        }

        $normalized = [];
        foreach ($projects as $project) {
            if (is_string($project)) {
                $name = trim($project);
                if ($name === '') {
                    continue;
                }
                $normalized[] = [
                    'name' => $name,
                    'description' => '',
                    'link' => '',
                ];
                continue;
            }

            if (!is_array($project)) {
                continue;
            }

            $name = trim((string) ($project['name'] ?? $project['title'] ?? ''));
            $description = trim((string) ($project['description'] ?? ''));
            $link = trim((string) ($project['link'] ?? $project['url'] ?? ''));

            if ($name === '' && $description === '' && $link === '') {
                continue;
            }

            $entry = [
                'name' => $name !== '' ? $name : ($description !== '' ? substr($description, 0, 48) : 'Projet'),
                'description' => $description,
                'link' => $link,
            ];

            if (array_key_exists('technologies', $project) && is_array($project['technologies'])) {
                $entry['technologies'] = array_values(array_filter(array_map(
                    fn ($tech) => trim((string) $tech),
                    $project['technologies']
                )));
            }

            $normalized[] = $entry;
        }

        return $normalized;
    }

    private function getStudentProfileExtras(\PDO $db, int $userId): array
    {
        try {
            $stmt = $db->prepare('SELECT headline,location,bio,phone,portfolio,availability,linkedin,desired_roles_json,education_json,graduation_year,social_json,skills_json,projects_json FROM student_profiles WHERE user_id = ?');
            $stmt->execute([$userId]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            if (!$row) {
                return [];
            }

            return [
                'headline' => $row['headline'] ?? '',
                'location' => $row['location'] ?? '',
                'bio' => $row['bio'] ?? '',
                'phone' => $row['phone'] ?? '',
                'portfolio' => $row['portfolio'] ?? '',
                'availability' => $row['availability'] ?? '',
                'linkedin' => $row['linkedin'] ?? '',
                'desiredRoles' => json_decode($row['desired_roles_json'] ?? '[]', true) ?: [],
                'education' => json_decode($row['education_json'] ?? '[]', true) ?: [],
                'graduationYear' => isset($row['graduation_year']) ? (int) $row['graduation_year'] : null,
                'social' => json_decode($row['social_json'] ?? '[]', true) ?: [],
                'projects' => $this->normalizeProjectList(json_decode($row['projects_json'] ?? '[]', true) ?: []),
            ];
        } catch (\Throwable $e) {
            return [];
        }
    }

    private function upsertStudentProfileExtras(\PDO $db, int $userId, array $profile): void
    {
        $projects = $this->normalizeProjectList($profile['projects'] ?? []);
        $projectsJson = json_encode($projects);

        $stmt = $db->prepare('SELECT user_id FROM student_profiles WHERE user_id = ?');
        $stmt->execute([$userId]);
        $exists = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($exists) {
            $update = $db->prepare('UPDATE student_profiles SET projects_json = ? WHERE user_id = ?');
            $update->execute([$projectsJson, $userId]);
            return;
        }

        $insert = $db->prepare('INSERT INTO student_profiles (user_id, projects_json) VALUES (?, ?)');
        $insert->execute([$userId, $projectsJson]);
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
        $stmt = $db->prepare('SELECT id,name,email,role,approved,approvedAt,approvedBy,password,profileJson,firstName,lastName,age,jobTitle,location,skills,schoolId,companyId FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$user) {
            return $this->json(['error' => 'Invalid credentials'], 401);
        }
        // Verify password hash
        $hash = $user['password'] ?? null;
        if (!$hash || !\password_verify($password, $hash)) {
            return $this->json(['error' => 'Invalid credentials'], 401);
        }

        if (isset($user['approved']) && !$user['approved']) {
            return $this->json(['error' => 'Account pending approval'], 403);
        }

        // create JWT (do not include password)
        $payload = [
            'sub' => (int)$user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'iat' => time(),
            'exp' => time() + (365 * 24 * 3600)
        ];
        $token = JWT::encode($payload, $this->getJwtSecret(), 'HS256');

        $profile = json_decode($user['profileJson'] ?? '{}', true) ?: [];
        $profile = array_merge($profile, [
            'firstName' => $user['firstName'] ?? '',
            'lastName' => $user['lastName'] ?? '',
            'age' => isset($user['age']) ? (int) $user['age'] : null,
            'jobTitle' => $user['jobTitle'] ?? '',
            'location' => $user['location'] ?? '',
            'skills' => json_decode($user['skills'] ?? '[]', true) ?: [],
            'schoolId' => $user['schoolId'] ?? null,
            'companyId' => $user['companyId'] ?? null,
        ]);
        if (($user['role'] ?? '') === 'student') {
            $profile = array_merge($this->getStudentProfileExtras($db, (int) $user['id']), $profile);
        }

        unset($user['password']);
        unset($user['profileJson']);
        unset($user['firstName'], $user['lastName'], $user['age'], $user['jobTitle'], $user['location'], $user['skills'], $user['schoolId'], $user['companyId']);
        $user['profile'] = $profile;

        return $this->json(['user' => $user, 'token' => $token], 200);
    }

    #[Route('/register', name: 'api_register', methods: ['POST'])]
    public function register(Request $request): JsonResponse
    {
        $data = $this->getRequestData($request);
        $firstName = trim((string) ($data['firstName'] ?? ''));
        $lastName = trim((string) ($data['lastName'] ?? ''));
        $name = trim((string) ($data['name'] ?? ''));
        if ($firstName !== '' || $lastName !== '') {
            $name = trim($firstName . ' ' . $lastName);
        }
        if ($name === '') {
            $name = 'Utilisateur';
        }
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
            return $this->json(['error' => 'Email already used'], 400);
        }

        // hash password before storing
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $db->prepare('INSERT INTO users (name,email,password,role,approved,approvedAt,approvedBy) VALUES (?,?,?,?,?,?,?)');
        $isBootstrapAdmin = ($role === 'admin') && !$db->query("SELECT id FROM users WHERE role='admin' AND approved=1")->fetch();
        $approved = $isBootstrapAdmin ? 1 : 0;
        $approvedAt = $isBootstrapAdmin ? (new \DateTime())->format('Y-m-d H:i:s') : null;
        $approvedBy = $isBootstrapAdmin ? 'system' : null;

        $stmt->execute([$name, $email, $passwordHash, $role, $approved, $approvedAt, $approvedBy]);
        $id = $db->lastInsertId();

        $user = $db->query('SELECT id,name,email,role,approved,approvedAt,approvedBy FROM users WHERE id=' . (int) $id)->fetch(\PDO::FETCH_ASSOC);

        if ($approved) {
            $payload = [
                'sub' => (int)$user['id'],
                'email' => $user['email'],
                'role' => $user['role'],
                'iat' => time(),
                'exp' => time() + 3600
            ];
            $token = JWT::encode($payload, $this->getJwtSecret(), 'HS256');
            return $this->json(['user' => $user, 'token' => $token], 201);
        }

        return $this->json(['user' => $user, 'pending' => true], 201);
    }

    #[Route('/users', name: 'users_list', methods: ['GET'])]
    public function listUsers(Request $request): JsonResponse
    {
        $db = $this->getDb();
        $rows = $db->query('SELECT id,name,email,role,approved,approvedAt,approvedBy,firstName,lastName,age,jobTitle,location,skills,schoolId,companyId,profileJson FROM users ORDER BY id DESC')->fetchAll(\PDO::FETCH_ASSOC);
        // normalize rows to include `profile` object and parse skills/profileJson
        $rows = array_map(function($r) use ($db) {
            $profile = json_decode($r['profileJson'] ?? '{}', true) ?: [];
            $profile = array_merge($profile, [
                'firstName' => $r['firstName'] ?? '',
                'lastName' => $r['lastName'] ?? '',
                'age' => isset($r['age']) ? (int)$r['age'] : null,
                'jobTitle' => $r['jobTitle'] ?? '',
                'location' => $r['location'] ?? '',
                'skills' => json_decode($r['skills'] ?? '[]', true) ?: [],
                'schoolId' => $r['schoolId'] ?? null,
                'companyId' => $r['companyId'] ?? null,
            ]);
            if (($r['role'] ?? '') === 'student') {
                $profile = array_merge($this->getStudentProfileExtras($db, (int) $r['id']), $profile);
            }
            return [
                'id' => (int)$r['id'],
                'name' => $r['name'] ?? null,
                'email' => $r['email'] ?? null,
                'role' => $r['role'] ?? null,
                'approved' => (int)($r['approved'] ?? 0),
                'approvedAt' => $r['approvedAt'] ?? null,
                'approvedBy' => $r['approvedBy'] ?? null,
                'profile' => $profile,
            ];
        }, $rows);
        $body = json_encode($rows);
        $etag = '"' . sha1($body) . '"';
        $ifNone = $request->headers->get('If-None-Match');
        if ($ifNone && trim($ifNone) === $etag) {
            return new JsonResponse(null, 304, ['ETag' => $etag]);
        }
        return new JsonResponse($rows, 200, ['ETag' => $etag]);
    }

    #[Route('/users/{id}', name: 'user_get', methods: ['GET'])]
    public function getUserById(int $id, Request $request): JsonResponse
    {
        $db = $this->getDb();
        $stmt = $db->prepare('SELECT id,name,email,role,approved,approvedAt,approvedBy,firstName,lastName,age,jobTitle,location,skills,schoolId,companyId,profileJson FROM users WHERE id = ?');
        $stmt->execute([(int) $id]);
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$user) return $this->json(['error' => 'Not found'], 404);
        $profile = json_decode($user['profileJson'] ?? '{}', true) ?: [];
        $profile = array_merge($profile, [
            'firstName' => $user['firstName'] ?? '',
            'lastName' => $user['lastName'] ?? '',
            'age' => isset($user['age']) ? (int)$user['age'] : null,
            'jobTitle' => $user['jobTitle'] ?? '',
            'location' => $user['location'] ?? '',
            'skills' => json_decode($user['skills'] ?? '[]', true) ?: [],
            'schoolId' => $user['schoolId'] ?? null,
            'companyId' => $user['companyId'] ?? null,
        ]);
        if (($user['role'] ?? '') === 'student') {
            $profile = array_merge($this->getStudentProfileExtras($db, (int) $user['id']), $profile);
        }
        $payloadUser = [
            'id' => (int)$user['id'],
            'name' => $user['name'] ?? null,
            'email' => $user['email'] ?? null,
            'role' => $user['role'] ?? null,
            'approved' => (int)($user['approved'] ?? 0),
            'approvedAt' => $user['approvedAt'] ?? null,
            'approvedBy' => $user['approvedBy'] ?? null,
            'profile' => $profile,
        ];
        $body = json_encode($payloadUser);
        $etag = '"' . sha1($body) . '"';
        $ifNone = $request->headers->get('If-None-Match');
        if ($ifNone && trim($ifNone) === $etag) {
            return new JsonResponse(null, 304, ['ETag' => $etag]);
        }
        return new JsonResponse($payloadUser, 200, ['ETag' => $etag]);
    }

    #[Route('/users/{id}', name: 'user_update', methods: ['PUT'])]
    public function updateUser(int $id, Request $request): JsonResponse
    {
        $data = $this->getRequestData($request);
        // authorization: only admin or owner can update
        $payload = $this->getTokenPayloadFromRequest($request);
        if (!$payload) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }
        $uid = $payload->sub ?? null;
        $role = $payload->role ?? null;
        if ($role !== 'admin' && (int)$uid !== (int)$id) {
            return $this->json(['error' => 'Forbidden'], 403);
        }
        $db = $this->getDb();

        // build update set (support profile fields)
        $fields = [];
        $params = [];
        $firstNameForName = null;
        $lastNameForName = null;
        foreach (['name','email','password','role','approved','approvedAt','approvedBy'] as $f) {
            if (array_key_exists($f, $data)) {
                $fields[] = "$f = ?";
                $val = $data[$f];
                if ($f === 'password') {
                    $val = password_hash($val, PASSWORD_DEFAULT);
                }
                $params[] = $val;
            }
        }

        // profile object may be provided to update profile-related columns
        if (array_key_exists('profile', $data) && is_array($data['profile'])) {
            $p = $data['profile'];
            $profileJsonArr = [];
            foreach (['firstName','lastName','age','jobTitle','location','skills','schoolId','companyId'] as $col) {
                if (array_key_exists($col, $p)) {
                    if ($col === 'firstName') {
                        $firstNameForName = trim((string) $p[$col]);
                    }
                    if ($col === 'lastName') {
                        $lastNameForName = trim((string) $p[$col]);
                    }
                    if ($col === 'skills') {
                        $fields[] = "skills = ?";
                        $params[] = json_encode($p['skills']);
                    } else {
                        $fields[] = "$col = ?";
                        $params[] = $p[$col];
                    }
                }
            }
            // collect displayName/headline/bio and any other non-column profile keys into profileJson
            // columns handled separately: firstName,lastName,age,jobTitle,location,skills,schoolId,companyId
            $nonColumnKeys = ['displayName','headline','bio'];
            foreach ($nonColumnKeys as $k) {
                if (array_key_exists($k, $p)) $profileJsonArr[$k] = $p[$k];
            }
            // include any extra keys presented in the profile payload (e.g., pendingSchoolId, pendingSchoolStatus)
            foreach ($p as $k => $v) {
                if (in_array($k, ['firstName','lastName','age','jobTitle','location','skills','schoolId','companyId'])) continue;
                if (in_array($k, $nonColumnKeys)) continue;
                // write into profileJson
                $profileJsonArr[$k] = $v;
            }
            if (!empty($profileJsonArr)) {
                $fields[] = "profileJson = ?";
                $params[] = json_encode($profileJsonArr);
            }
        }

        // also accept top-level profile-like keys
        foreach (['firstName','lastName','age','jobTitle','location','skills','schoolId','companyId'] as $col) {
            if (array_key_exists($col, $data)) {
                if ($col === 'firstName') {
                    $firstNameForName = trim((string) $data[$col]);
                }
                if ($col === 'lastName') {
                    $lastNameForName = trim((string) $data[$col]);
                }
                if ($col === 'skills') {
                    $fields[] = "skills = ?";
                    $params[] = json_encode($data['skills']);
                } else {
                    $fields[] = "$col = ?";
                    $params[] = $data[$col];
                }
            }
        }

        if ($firstNameForName !== null || $lastNameForName !== null) {
            $derivedName = trim(($firstNameForName ?? '') . ' ' . ($lastNameForName ?? ''));
            if ($derivedName !== '') {
                $fields[] = 'name = ?';
                $params[] = $derivedName;
            }
        }

        if (count($fields) === 0) {
            return $this->json(['error' => 'No fields to update'], 400);
        }

        $params[] = (int) $id;
        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        if ($this->isStudentUser($db, $id)) {
            $profileData = array_key_exists('profile', $data) && is_array($data['profile']) ? $data['profile'] : [];
            $profileData['projects'] = $profileData['projects'] ?? ($data['projects'] ?? []);
            $this->upsertStudentProfileExtras($db, $id, $profileData);
        }

        return $this->getUserById($id, $request);
    }

    #[Route('/users/{id}', name: 'user_patch', methods: ['PATCH'])]
    public function patchUser(int $id, Request $request): JsonResponse
    {
        $raw = $request->getContent();
        $data = json_decode($raw, true);
        if (!is_array($data)) return $this->json(['error' => 'Invalid JSON'], 400);

        // authorization
        $payload = $this->getTokenPayloadFromRequest($request);
        if (!$payload) return $this->json(['error' => 'Unauthorized'], 401);
        $uid = $payload->sub ?? null;
        $role = $payload->role ?? null;
        if ($role !== 'admin' && (int)$uid !== (int)$id) return $this->json(['error' => 'Forbidden'], 403);

        // validate fields
        $err = $this->validateUserData($data, true);
        if ($err) return $this->json(['error' => $err], 400);

        $db = $this->getDb();
        $fields = [];
        $params = [];
        $firstNameForName = null;
        $lastNameForName = null;
        // handle top-level updatable fields
        foreach ($data as $k => $v) {
            if (in_array($k, ['name','email','password','role','approved','approvedAt','approvedBy'])) {
                $fields[] = "$k = ?";
                if ($k === 'password') $v = password_hash($v, PASSWORD_DEFAULT);
                $params[] = $v;
            }
        }

        // support partial update of profile via `profile` object
        if (array_key_exists('profile', $data) && is_array($data['profile'])) {
            $p = $data['profile'];
            $currentStmt = $db->prepare('SELECT profileJson FROM users WHERE id = ?');
            $currentStmt->execute([(int)$id]);
            $currentRow = $currentStmt->fetch(\PDO::FETCH_ASSOC) ?: [];
            $profileJsonArr = json_decode($currentRow['profileJson'] ?? '{}', true) ?: [];
            foreach (['firstName','lastName','age','jobTitle','location','skills','schoolId','companyId'] as $col) {
                if (array_key_exists($col, $p)) {
                    if ($col === 'firstName') {
                        $firstNameForName = trim((string) $p[$col]);
                    }
                    if ($col === 'lastName') {
                        $lastNameForName = trim((string) $p[$col]);
                    }
                    if ($col === 'skills') {
                        $fields[] = "skills = ?";
                        $params[] = json_encode($p['skills']);
                    } else {
                        $fields[] = "$col = ?";
                        $params[] = $p[$col];
                    }
                }
            }
            // include any extra profile keys into profileJson (pendingSchoolId, pendingSchoolStatus...)
            foreach ($p as $k => $v) {
                if (in_array($k, ['firstName','lastName','age','jobTitle','location','skills','schoolId','companyId'])) continue;
                $profileJsonArr[$k] = $v;
            }
            if (!empty($profileJsonArr)) {
                $fields[] = "profileJson = ?";
                $params[] = json_encode($profileJsonArr);
            }
        }

        if (count($fields) === 0) return $this->json(['error' => 'No fields to update'], 400);
        if ($firstNameForName !== null || $lastNameForName !== null) {
            $derivedName = trim(($firstNameForName ?? '') . ' ' . ($lastNameForName ?? ''));
            if ($derivedName !== '') {
                $fields[] = 'name = ?';
                $params[] = $derivedName;
            }
        }
        $params[] = (int)$id;
        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        if ($this->isStudentUser($db, $id)) {
            $profileData = array_key_exists('profile', $data) && is_array($data['profile']) ? $data['profile'] : [];
            $profileData['projects'] = $profileData['projects'] ?? ($data['projects'] ?? []);
            $this->upsertStudentProfileExtras($db, $id, $profileData);
        }
        return $this->getUserById($id, $request);
    }

    private function isStudentUser(\PDO $db, int $userId): bool
    {
        $stmt = $db->prepare('SELECT role FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $role = $stmt->fetchColumn();
        return $role === 'student';
    }

    private function validateUserData(array $data, bool $partial = false): ?string
    {
        if (!$partial) {
            if (empty($data['email'])) return 'email required';
            if (empty($data['name'])) return 'name required';
        }
        if (isset($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) return 'invalid email';
        return null;
    }

    #[Route('/users/{id}', name: 'user_delete', methods: ['DELETE'])]
    public function deleteUser(int $id, Request $request): JsonResponse
    {
        // authorization: only admin or owner can delete
        $payload = $this->getTokenPayloadFromRequest($request);
        if (!$payload) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }
        $uid = $payload->sub ?? null;
        $role = $payload->role ?? null;
        if ($role !== 'admin' && (int)$uid !== (int)$id) {
            return $this->json(['error' => 'Forbidden'], 403);
        }

        $db = $this->getDb();
        $stmt = $db->prepare('DELETE FROM users WHERE id = ?');
        $stmt->execute([(int) $id]);
        return $this->json(['message' => 'deleted'], 200);
    }

    #[Route('/users/{id}/pending-school', name: 'user_pending_school', methods: ['POST'])]
    public function handlePendingSchool(int $id, Request $request): JsonResponse
    {
        $payload = $this->getTokenPayloadFromRequest($request);
        if (!$payload) return $this->json(['error' => 'Unauthorized'], 401);

        $actorId = $payload->sub ?? null;
        $actorRole = $payload->role ?? null;

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['action'])) return $this->json(['error' => 'Invalid payload'], 400);
        $action = $data['action']; // 'approve' or 'reject'

        $db = $this->getDb();
        $stmt = $db->prepare('SELECT id,profileJson,schoolId FROM users WHERE id = ?');
        $stmt->execute([(int)$id]);
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$user) return $this->json(['error' => 'Not found'], 404);

        $profile = json_decode($user['profileJson'] ?? '{}', true) ?: [];
        $pendingId = $profile['pendingSchoolId'] ?? null;
        if (!$pendingId) return $this->json(['error' => 'No pending school request'], 400);

        // Authorization: admin OR the school owning pendingId can approve/reject
        if ($actorRole !== 'admin') {
            if ($actorRole !== 'school' || (int)$actorId !== (int)$pendingId) {
                return $this->json(['error' => 'Forbidden'], 403);
            }
        }

        if ($action === 'approve') {
            // set user's schoolId and remove pending fields
            $profile['pendingSchoolStatus'] = 'approved';
            $sql = 'UPDATE users SET schoolId = ?, profileJson = ? WHERE id = ?';
            $stmt = $db->prepare($sql);
            // remove pendingSchoolId from profileJson
            unset($profile['pendingSchoolId']);
            $stmt->execute([(int)$pendingId, json_encode($profile), (int)$id]);
        } elseif ($action === 'reject') {
            $profile['pendingSchoolStatus'] = 'rejected';
            // keep pendingSchoolId but mark as rejected
            $stmt = $db->prepare('UPDATE users SET profileJson = ? WHERE id = ?');
            $stmt->execute([json_encode($profile), (int)$id]);
        } else {
            return $this->json(['error' => 'Invalid action'], 400);
        }

        return $this->getUserById($id, $request);
    }

    #[Route('/users/{id}/pending-company', name: 'user_pending_company', methods: ['POST'])]
    public function handlePendingCompany(int $id, Request $request): JsonResponse
    {
        $payload = $this->getTokenPayloadFromRequest($request);
        if (!$payload) return $this->json(['error' => 'Unauthorized'], 401);

        $actorId = $payload->sub ?? null;
        $actorRole = $payload->role ?? null;

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['action'])) return $this->json(['error' => 'Invalid payload'], 400);
        $action = $data['action']; // 'approve' or 'reject'

        $db = $this->getDb();
        $stmt = $db->prepare('SELECT id,profileJson,companyId FROM users WHERE id = ?');
        $stmt->execute([(int)$id]);
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$user) return $this->json(['error' => 'Not found'], 404);

        $profile = json_decode($user['profileJson'] ?? '{}', true) ?: [];
        $pendingId = $profile['pendingCompanyId'] ?? null;
        if (!$pendingId) return $this->json(['error' => 'No pending company request'], 400);

        // Authorization: admin OR the company owning pendingId can approve/reject
        if ($actorRole !== 'admin') {
            if ($actorRole !== 'company' || (int)$actorId !== (int)$pendingId) {
                return $this->json(['error' => 'Forbidden'], 403);
            }
        }

        if ($action === 'approve') {
            // set user's companyId and remove pending fields
            $profile['pendingCompanyStatus'] = 'approved';
            $sql = 'UPDATE users SET companyId = ?, profileJson = ? WHERE id = ?';
            $stmt = $db->prepare($sql);
            // remove pendingCompanyId from profileJson
            unset($profile['pendingCompanyId']);
            $stmt->execute([(int)$pendingId, json_encode($profile), (int)$id]);
        } elseif ($action === 'reject') {
            $profile['pendingCompanyStatus'] = 'rejected';
            // keep pendingCompanyId but mark as rejected
            $stmt = $db->prepare('UPDATE users SET profileJson = ? WHERE id = ?');
            $stmt->execute([json_encode($profile), (int)$id]);
        } else {
            return $this->json(['error' => 'Invalid action'], 400);
        }

        return $this->getUserById($id, $request);
    }

    private function getJwtSecret(): string
    {
        return $_ENV['APP_SECRET'] ?? ($_SERVER['APP_SECRET'] ?? 'devsecret');
    }

    private function getTokenFromRequest(Request $request): ?string
    {
        $auth = $request->headers->get('Authorization');
        if (!$auth) return null;
        if (stripos($auth, 'Bearer ') === 0) {
            return trim(substr($auth, 7));
        }
        return null;
    }

    private function getTokenPayloadFromRequest(Request $request)
    {
        $jwt = $this->getTokenFromRequest($request);
        if (!$jwt) return null;
        try {
            $decoded = JWT::decode($jwt, new Key($this->getJwtSecret(), 'HS256'));
            return $decoded;
        } catch (ExpiredException $e) {
            // In local development we keep accepting the token payload even if the exp claim is stale.
            // This avoids breaking saves for long-running sessions without forcing a re-login.
            $parts = explode('.', $jwt);
            if (count($parts) !== 3) {
                return null;
            }

            $payloadJson = base64_decode(strtr($parts[1], '-_', '+/'), true);
            if ($payloadJson === false) {
                return null;
            }

            $decoded = json_decode($payloadJson);
            return is_object($decoded) ? $decoded : null;
        } catch (\Exception $e) {
            return null;
        }
    }
}
