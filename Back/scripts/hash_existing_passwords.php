<?php
$dbFile = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'var' . DIRECTORY_SEPARATOR . 'cvtheque.db';
$dsn = 'sqlite:' . $dbFile;
$opts = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION];
$db = new PDO($dsn, null, null, $opts);
$updated = 0;
foreach ($db->query('SELECT id,password FROM users') as $row) {
    $id = $row['id'];
    $pw = $row['password'];
    // simple heuristic: if password doesn't start with $ it's likely plain
    if (!is_string($pw) || strlen($pw) === 0) continue;
    if ($pw[0] !== '$') {
        $hash = password_hash($pw, PASSWORD_DEFAULT);
        $stmt = $db->prepare('UPDATE users SET password = ? WHERE id = ?');
        $stmt->execute([$hash, $id]);
        $updated++;
        echo "Updated user $id\n";
    }
}
echo "Done. Updated: $updated\n";
