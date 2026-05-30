<?php
// Migration: add profile columns to users and copy data from student/schools/companies tables
$dbFile = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'var' . DIRECTORY_SEPARATOR . 'cvtheque.db';
$dsn = 'sqlite:' . $dbFile;
$opts = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION];
$db = new PDO($dsn, null, null, $opts);

function hasColumn(PDO $db, string $table, string $col): bool {
    $stmt = $db->query("PRAGMA table_info('" . $table . "')");
    $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $c) {
        if (strcasecmp($c['name'], $col) === 0) return true;
    }
    return false;
}

$adds = [
    "firstName TEXT",
    "lastName TEXT",
    "age INTEGER",
    "jobTitle TEXT",
    "location TEXT",
    "skills TEXT", /* JSON */
    "schoolId INTEGER",
    "companyId INTEGER",
    "profileJson TEXT"
];

foreach ($adds as $spec) {
    [$col] = explode(' ', $spec, 2);
    if (!hasColumn($db, 'users', $col)) {
        echo "Adding column $col to users...\n";
        $db->exec("ALTER TABLE users ADD COLUMN $spec;");
    } else {
        echo "Column $col already exists, skipping.\n";
    }
}

// Fetch students, schools, companies into arrays keyed by email and id
$students = [];
$students_by_email = [];
foreach ($db->query('SELECT * FROM student') as $s) {
    $students[$s['id']] = $s;
    if (!empty($s['email'])) $students_by_email[strtolower($s['email'])] = $s;
}

$schools = [];
foreach ($db->query('SELECT * FROM school') as $r) $schools[$r['id']] = $r;

$companies = [];
foreach ($db->query('SELECT * FROM company') as $r) $companies[$r['id']] = $r;

// Migrate per user
$users = $db->query('SELECT * FROM users')->fetchAll(PDO::FETCH_ASSOC);
$updateStmt = $db->prepare('UPDATE users SET firstName = ?, lastName = ?, age = ?, jobTitle = ?, location = ?, skills = ?, schoolId = ?, companyId = ?, profileJson = ? WHERE id = ?');

foreach ($users as $u) {
    $uid = $u['id'];
    $email = strtolower($u['email'] ?? '');
    $first = $last = $age = $jobTitle = $location = '';
    $skills = [];
    $schoolId = null;
    $companyId = null;

    $found = null;
    if ($email && isset($students_by_email[$email])) {
        $found = $students_by_email[$email];
    } else {
        // try to match by name minimally
        foreach ($students as $s) {
            $name = trim(($s['firstName'] ?? '') . ' ' . ($s['lastName'] ?? ''));
            if ($name !== '' && strtolower($name) === strtolower(trim($u['name'] ?? ''))) { $found = $s; break; }
        }
    }

    if ($found) {
        $first = $found['firstName'] ?? '';
        $last = $found['lastName'] ?? '';
        $age = $found['age'] ?? 0;
        $jobTitle = $found['jobTitle'] ?? '';
        $location = $found['location'] ?? '';
        // try student_profiles table for skills JSON
        $skills = [];
        $sp = $db->query("SELECT * FROM student_profiles WHERE student_id = " . (int)$found['id'])->fetch(PDO::FETCH_ASSOC);
        if ($sp && isset($sp['skills'])) {
            $skills = json_decode($sp['skills'], true) ?? [];
        }
        // map school/company ids
        if (!empty($found['school_id'])) $schoolId = $found['school_id'];
        if (!empty($found['company_id'])) $companyId = $found['company_id'];
    }

    $profileJson = json_encode([
        'displayName' => $u['name'] ?? '',
        'headline' => '',
        'bio' => '',
    ]);

    $skillsJson = json_encode($skills);

    $updateStmt->execute([$first, $last, $age, $jobTitle, $location, $skillsJson, $schoolId, $companyId, $profileJson, $uid]);
    echo "User $uid updated\n";
}

echo "Migration complete.\n";
