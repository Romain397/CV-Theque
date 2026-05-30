<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Firebase\JWT\JWT;
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
        $stmt = $db->prepare('SELECT id,name,email,role,approved,approvedAt,approvedBy,password FROM users WHERE email = ?');
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
            'exp' => time() + 3600
        ];
        $token = JWT::encode($payload, $this->getJwtSecret(), 'HS256');

        unset($user['password']);
        return $this->json(['user' => $user, 'token' => $token], 200);
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
        $rows = array_map(function($r){
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
                if ($col === 'skills') {
                    $fields[] = "skills = ?";
                    $params[] = json_encode($data['skills']);
                } else {
                    $fields[] = "$col = ?";
                    $params[] = $data[$col];
                }
            }
        }

        if (count($fields) === 0) {
            return $this->json(['error' => 'No fields to update'], 400, ['Access-Control-Allow-Origin' => '*','Access-Control-Allow-Headers'=>'Content-Type','Access-Control-Allow-Methods'=>'PUT,OPTIONS']);
        }

        $params[] = (int) $id;
        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        return $this->getUserById($id, $request);
    }

    #[Route('/users/{id}', name: 'user_patch', methods: ['PATCH'])]
    public function patchUser(int $id, Request $request): JsonResponse
    {
        $raw = $request->getContent();
        // log incoming PATCH for debugging
        @file_put_contents(__DIR__ . '/../../var/debug_cors.log', "[PATCH IN] " . date('c') . " URL: " . $request->getRequestUri() . " Origin: " . ($request->headers->get('Origin') ?? '') . " Auth: " . ($request->headers->get('Authorization') ? 'yes' : 'no') . " Body: " . substr($raw, 0, 4096) . "\n", FILE_APPEND);
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
            $profileJsonArr = [];
            foreach (['firstName','lastName','age','jobTitle','location','skills','schoolId','companyId'] as $col) {
                if (array_key_exists($col, $p)) {
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
        $params[] = (int)$id;
        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        @file_put_contents(__DIR__ . '/../../var/debug_cors.log', "[PATCH DONE] " . date('c') . " URL: " . $request->getRequestUri() . " Status: 200\n", FILE_APPEND);
        return $this->getUserById($id, $request);
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

    #[Route('/users/{id}/profile-form', name: 'user_profile_form', methods: ['POST'])]
    public function profileForm(int $id, Request $request): JsonResponse
    {
        // Accept form-encoded fallback when JSON preflight is blocked by intermediaries
        // log headers for debugging auth issues
        @file_put_contents(__DIR__ . '/../../var/debug_cors.log', "[PROFILE_FORM IN] " . date('c') . " URL: " . $request->getRequestUri() . " Headers: " . json_encode($request->headers->all()) . "\n", FILE_APPEND);
        $payload = $this->getTokenPayloadFromRequest($request);
        if (!$payload) {
            // try token from form body as a fallback
            $dataTmp = $request->request->all();
            if (!empty($dataTmp['token'])) {
                @file_put_contents(__DIR__ . '/../../var/debug_cors.log', "[PROFILE_FORM TRY_BODY_TOKEN] " . date('c') . " URL: " . $request->getRequestUri() . "\n", FILE_APPEND);
                $jwt = $dataTmp['token'];
                try {
                    $decoded = JWT::decode($jwt, new Key($this->getJwtSecret(), 'HS256'));
                    $payload = $decoded;
                } catch (\Exception $e) {
                    @file_put_contents(__DIR__ . '/../../var/debug_cors.log', "[PROFILE_FORM BODY_TOKEN_DECODE_ERROR] " . date('c') . " Error: " . $e->getMessage() . "\n", FILE_APPEND);
                }
            }
        }
        if (!$payload) {
            @file_put_contents(__DIR__ . '/../../var/debug_cors.log', "[PROFILE_FORM AUTH_FAIL] " . date('c') . " URL: " . $request->getRequestUri() . " Authorization: " . ($request->headers->get('Authorization') ?? 'none') . "\n", FILE_APPEND);
            // Development bypass: allow updating from localhost origins when DEV_AUTH_BYPASS=1
            $devBypass = ($_ENV['DEV_AUTH_BYPASS'] ?? $_SERVER['DEV_AUTH_BYPASS'] ?? '0') === '1';
            $origin = $request->headers->get('Origin');
            $allowedDevOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174'];
            if ($devBypass && in_array($origin, $allowedDevOrigins, true)) {
                @file_put_contents(__DIR__ . '/../../var/debug_cors.log', "[PROFILE_FORM DEV_BYPASS] " . date('c') . " URL: " . $request->getRequestUri() . " Origin: " . ($origin ?? 'none') . "\n", FILE_APPEND);
                // Fake payload: owner is the target id (allow user to update their own profile in dev)
                $payload = (object)['sub' => (int)$id, 'role' => 'student'];
            } else {
                return $this->json(['error' => 'Unauthorized'], 401);
            }
        }
        $uid = $payload->sub ?? null;
        $role = $payload->role ?? null;
        if ($role !== 'admin' && (int)$uid !== (int)$id) {
            @file_put_contents(__DIR__ . '/../../var/debug_cors.log', "[PROFILE_FORM FORBIDDEN] " . date('c') . " URL: " . $request->getRequestUri() . " token_sub: " . ($uid ?? 'null') . " role: " . ($role ?? 'null') . "\n", FILE_APPEND);
            return $this->json(['error' => 'Forbidden'], 403);
        }

        $db = $this->getDb();

        // collect allowed fields from form body
        $data = $request->request->all();

        $fields = [];
        $params = [];

        // allow updating profile via a 'profile' JSON string or top-level fields
        $profileArr = [];
        if (!empty($data['profile'])) {
            $decoded = json_decode($data['profile'], true);
            if (is_array($decoded)) $profileArr = $decoded;
        }
        foreach (['pendingSchoolId','pendingSchoolStatus','pendingCompanyId','pendingCompanyStatus','firstName','lastName','age','jobTitle','location'] as $k) {
            if (array_key_exists($k, $profileArr)) {
                // top-level column handling
                if (in_array($k, ['pendingSchoolId','pendingCompanyId'])) {
                    // store into profileJson
                    $profileJsonArr[$k] = $profileArr[$k];
                } elseif ($k === 'age') {
                    $profileJsonArr[$k] = (int)$profileArr[$k];
                } else {
                    $profileJsonArr[$k] = $profileArr[$k];
                }
            }
        }

        // also look for top-level keys
        foreach (['firstName','lastName','age','jobTitle','location'] as $col) {
            if (array_key_exists($col, $data)) {
                if ($col === 'age') $fields[] = "$col = ?";
                else $fields[] = "$col = ?";
                $params[] = $data[$col];
            }
        }

        // write profileJson if any
        if (!empty($profileJsonArr)) {
            $fields[] = 'profileJson = ?';
            $params[] = json_encode($profileJsonArr);
        }

        if (count($fields) === 0) return $this->json(['error' => 'No fields to update'], 400);
        $params[] = (int)$id;
        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        return $this->getUserById($id, $request);
    }

    // Global OPTIONS handler for CORS preflight
    #[Route('/{any}', name: 'cors_options', requirements: ['any' => '.*'], methods: ['OPTIONS'])]
    public function options(): JsonResponse
    {
        return new JsonResponse(null, 200);
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
        } catch (\Exception $e) {
            @file_put_contents(__DIR__ . '/../../var/debug_cors.log', "[JWT_DECODE_ERROR] " . date('c') . " Error: " . $e->getMessage() . " Token: " . substr($jwt,0,60) . "\n", FILE_APPEND);
            return null;
        }
    }
}
