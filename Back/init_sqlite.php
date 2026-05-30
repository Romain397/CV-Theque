<?php
// Script d'initialisation d'une base SQLite pour le projet Back
// Usage: php init_sqlite.php

// Target the Symfony runtime DB used by start-dev.sh
$dbFile = __DIR__ . DIRECTORY_SEPARATOR . 'var' . DIRECTORY_SEPARATOR . 'cvtheque.db';

// Ensure the var directory exists (same location Symfony expects)
if (!is_dir(dirname($dbFile))) {
  mkdir(dirname($dbFile), 0755, true);
}

try {
    $dsn = 'sqlite:' . $dbFile;
    $opts = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION];
    $db = new PDO($dsn, null, null, $opts);

    $db->beginTransaction();

    // users
    $db->exec(<<<'SQL'
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT
    );
    SQL
    );

    // student_profiles
    $db->exec(<<<'SQL'
    CREATE TABLE IF NOT EXISTS student_profiles (
      user_id INTEGER PRIMARY KEY,
      headline TEXT,
      location TEXT,
      bio TEXT,
      phone TEXT,
      portfolio TEXT,
      availability TEXT,
      linkedin TEXT,
      desired_roles_json TEXT DEFAULT '[]',
      education_json TEXT DEFAULT '[]',
      graduation_year INTEGER,
      social_json TEXT DEFAULT '[]',
      skills_json TEXT DEFAULT '[]',
      projects_json TEXT DEFAULT '[]',
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
    SQL
    );

    // schools
    $db->exec(<<<'SQL'
    CREATE TABLE IF NOT EXISTS schools (
      id INTEGER PRIMARY KEY,
      name TEXT,
      slug TEXT UNIQUE,
      description TEXT,
      website TEXT,
      location TEXT,
      extra_json TEXT DEFAULT '[]'
    );
    SQL
    );

    // company_profiles
    $db->exec(<<<'SQL'
    CREATE TABLE IF NOT EXISTS company_profiles (
      user_id INTEGER PRIMARY KEY,
      description TEXT,
      website TEXT,
      location TEXT,
      contact_name TEXT,
      phone TEXT,
      extra_json TEXT DEFAULT '[]',
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
    SQL
    );

    // jobs
    $db->exec(<<<'SQL'
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY,
      title TEXT,
      description TEXT,
      company_id INTEGER,
      location TEXT,
      school_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES users(id),
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );
    SQL
    );

    // applications
    $db->exec(<<<'SQL'
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY,
      job_id INTEGER,
      student_id INTEGER,
      message TEXT,
      status TEXT DEFAULT 'new',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(job_id) REFERENCES jobs(id),
      FOREIGN KEY(student_id) REFERENCES users(id)
    );
    SQL
    );

    // applications_history
    $db->exec(<<<'SQL'
    CREATE TABLE IF NOT EXISTS applications_history (
      id INTEGER PRIMARY KEY,
      application_id INTEGER,
      status TEXT,
      note TEXT,
      changed_by INTEGER,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(application_id) REFERENCES applications(id),
      FOREIGN KEY(changed_by) REFERENCES users(id)
    );
    SQL
    );

    // Backfill / add missing columns if older schema
    $addColumnIfMissing = function($table, $colDef) use ($db) {
        // $colDef example: "phone TEXT"
        [$col, $rest] = explode(' ', trim($colDef), 2);
        $cols = $db->query("PRAGMA table_info($table)")->fetchAll(PDO::FETCH_ASSOC);
        $names = array_map(fn($r)=>$r['name'], $cols);
        if (!in_array($col, $names)) {
            $db->exec("ALTER TABLE $table ADD COLUMN $colDef;");
        }
    };

    // ensure student_profiles columns
    $addColumnIfMissing('student_profiles', "phone TEXT");
    $addColumnIfMissing('student_profiles', "portfolio TEXT");
    $addColumnIfMissing('student_profiles', "availability TEXT");
    $addColumnIfMissing('student_profiles', "linkedin TEXT");
    $addColumnIfMissing('student_profiles', "desired_roles_json TEXT DEFAULT '[]'");
    $addColumnIfMissing('student_profiles', "education_json TEXT DEFAULT '[]'");
    $addColumnIfMissing('student_profiles', "graduation_year INTEGER");
    $addColumnIfMissing('student_profiles', "social_json TEXT DEFAULT '[]'");

    // ensure jobs.school_id
    $addColumnIfMissing('jobs', "school_id INTEGER");

    // ensure applications.status
    $addColumnIfMissing('applications', "status TEXT DEFAULT 'new'");

    // Seed initial data only if users table empty
    $cnt = $db->query('SELECT COUNT(*) as c FROM users')->fetch(PDO::FETCH_ASSOC)['c'] ?? 0;
    if ($cnt == 0) {
        // Insert sample users
        $now = (new DateTime())->format('Y-m-d H:i:s');
        $stmt = $db->prepare('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)');
        $stmt->execute(['Alice Etudiant','alice@example.com','password','student']);
        $studentId = $db->lastInsertId();
        $stmt->execute(['Acme Corp','hr@acme.example','password','company']);
        $companyId = $db->lastInsertId();

        // student profile
        $sp = $db->prepare('INSERT INTO student_profiles (user_id,headline,location,bio,phone,portfolio,availability,linkedin,desired_roles_json,education_json,graduation_year,social_json,skills_json,projects_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        $sp->execute([
            $studentId,
            'Développeur Frontend',
            'Paris, France',
            'Étudiant en 2ème année, passionné par React et UI.',
            '+33 6 12 34 56 78',
            'https://portfolio.example.com/alice',
            'Immédiate',
            'https://linkedin.com/in/alice',
            json_encode(['Frontend Developer','UI Engineer']),
            json_encode([['school'=>'École XYZ','degree'=>'Licence','year'=>2024]]),
            2024,
            json_encode([]),
            json_encode([['name'=>'React', 'level'=>'intermediate']]),
            json_encode([['title'=>'Mini-projet', 'description'=>'Une petite app React']])
        ]);

        // school
        // Note: escape single quotes inside SQL string (École d''ingénieurs)
        $db->exec("INSERT INTO schools (name,slug,description,website,location) VALUES ('École XYZ','ecole-xyz','École d''ingénieurs','https://ecole.example','Paris')");
        $schoolId = $db->lastInsertId();

        // job
        $db->prepare('INSERT INTO jobs (title,description,company_id,location,school_id) VALUES (?,?,?,?,?)')
           ->execute(['Stagiaire Frontend','Stage 6 mois sur React.', $companyId, 'Paris', $schoolId]);
        $jobId = $db->lastInsertId();

        // application
        $db->prepare('INSERT INTO applications (job_id,student_id,message,status) VALUES (?,?,?,?)')
           ->execute([$jobId, $studentId, 'Bonjour, je suis intéressé par ce stage.', 'new']);

        // applications_history
        $appId = $db->lastInsertId();
        $db->prepare('INSERT INTO applications_history (application_id,status,note,changed_by) VALUES (?,?,?,?)')
           ->execute([$appId, 'new', 'Création initiale', $studentId]);
    }

    $db->commit();

    echo "SQLite database initialized at: $dbFile\n";
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    fwrite(STDERR, "Erreur: " . $e->getMessage() . "\n");
    exit(1);
}

return 0;
