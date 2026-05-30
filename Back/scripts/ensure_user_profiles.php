<?php
// Ensure each user has a normalized profile JSON in the database.
$candidates = [
    __DIR__ . '/../../var/cvtheque.db',
    getcwd() . '/Back/var/cvtheque.db',
    __DIR__ . '/../var/cvtheque.db',
    __DIR__ . '/../../var/cvtheque.db',
];
$dbFile = null;
foreach ($candidates as $c) {
    if (file_exists($c)) {
        $dbFile = $c;
        break;
    }
}
if (!$dbFile) {
    echo "DB not found (looked in candidates):\n" . implode("\n", $candidates) . "\n";
    exit(1);
}

$pdo = new PDO('sqlite:' . $dbFile);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$stmt = $pdo->query('SELECT * FROM users');
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

$update = $pdo->prepare('UPDATE users SET profileJson = :profile WHERE id = :id');
$count = 0;
foreach ($users as $u) {
    $id = $u['id'];
    $existing = null;
    if (!empty($u['profileJson'])) {
        $existing = @json_decode($u['profileJson'], true);
    }
    if (!is_array($existing)) $existing = [];

    // normalize from columns if present
    $profile = $existing;
    $cols = ['displayName','headline','bio','firstName','lastName','age','jobTitle','location','skills','schoolId','companyId'];
    foreach ($cols as $c) {
        if ((isset($u[$c]) && $u[$c] !== null && $u[$c] !== '') && !isset($profile[$c])) {
            $profile[$c] = $u[$c];
        }
    }

    // ensure types
    if (!isset($profile['skills']) || !is_array(@$profile['skills'])) {
        $profile['skills'] = [];
    }
    if (!isset($profile['displayName']) || $profile['displayName'] === '') {
        $profile['displayName'] = $u['name'] ?? '';
    }

    $json = json_encode($profile, JSON_UNESCAPED_UNICODE);
    if ($json !== ($u['profileJson'] ?? '')) {
        $update->execute([':profile' => $json, ':id' => $id]);
        $count++;
        echo "User $id normalized\n";
    }
}

echo "Done. Updated: $count users\n";

return 0;

?>
