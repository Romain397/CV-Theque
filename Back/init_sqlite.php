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
      role TEXT,
      approved INTEGER DEFAULT 0,
      approvedAt TEXT,
      approvedBy TEXT
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
    $addColumnIfMissing('users', "approved INTEGER DEFAULT 0");
    $addColumnIfMissing('users', "approvedAt TEXT");
    $addColumnIfMissing('users', "approvedBy TEXT");
    $addColumnIfMissing('users', "firstName TEXT");
    $addColumnIfMissing('users', "lastName TEXT");
    $addColumnIfMissing('users', "age INTEGER");
    $addColumnIfMissing('users', "jobTitle TEXT");
    $addColumnIfMissing('users', "location TEXT");
    $addColumnIfMissing('users', "skills TEXT");
    $addColumnIfMissing('users', "schoolId INTEGER");
    $addColumnIfMissing('users', "companyId INTEGER");
    $addColumnIfMissing('users', "profileJson TEXT");

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

    $ensureSchool = function(string $name, string $slug, string $description, string $website, string $location) use ($db): int {
        $stmt = $db->prepare('SELECT id FROM schools WHERE slug = ? LIMIT 1');
        $stmt->execute([$slug]);
        $found = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($found) {
            return (int) $found['id'];
        }

        $insert = $db->prepare('INSERT INTO schools (name,slug,description,website,location) VALUES (?,?,?,?,?)');
        $insert->execute([$name, $slug, $description, $website, $location]);
        return (int) $db->lastInsertId();
    };

    $ensureUserByEmail = function(array $userData) use ($db): int {
        $stmt = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$userData['email']]);
        $found = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($found) {
            return (int) $found['id'];
        }

        $insert = $db->prepare('INSERT INTO users (name,email,password,role,firstName,lastName,age,jobTitle,location,skills,schoolId,companyId,profileJson) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
        $insert->execute([
            $userData['name'],
            $userData['email'],
            password_hash($userData['password'] ?? 'password', PASSWORD_DEFAULT),
            $userData['role'],
            $userData['firstName'] ?? null,
            $userData['lastName'] ?? null,
            $userData['age'] ?? null,
            $userData['jobTitle'] ?? null,
            $userData['location'] ?? null,
            json_encode($userData['skills'] ?? []),
            $userData['schoolId'] ?? null,
            $userData['companyId'] ?? null,
            $userData['profileJson'] ?? json_encode([]),
        ]);
        return (int) $db->lastInsertId();
    };

    $ensureStudentProfile = function(int $userId, array $profile) use ($db): void {
        $stmt = $db->prepare('SELECT user_id FROM student_profiles WHERE user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $exists = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($exists) {
            $update = $db->prepare('UPDATE student_profiles SET headline = ?, location = ?, bio = ?, skills_json = ?, projects_json = ? WHERE user_id = ?');
            $update->execute([
                $profile['headline'] ?? '',
                $profile['location'] ?? '',
                $profile['bio'] ?? '',
                json_encode($profile['skills'] ?? []),
                json_encode($profile['projects'] ?? []),
                $userId,
            ]);
            return;
        }

        $insert = $db->prepare('INSERT INTO student_profiles (user_id,headline,location,bio,phone,portfolio,availability,linkedin,desired_roles_json,education_json,graduation_year,social_json,skills_json,projects_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        $insert->execute([
            $userId,
            $profile['headline'] ?? '',
            $profile['location'] ?? '',
            $profile['bio'] ?? '',
            '+33 6 12 34 56 78',
            $profile['portfolio'] ?? '',
            'Immédiate',
            $profile['linkedin'] ?? '',
            json_encode($profile['desiredRoles'] ?? []),
            json_encode($profile['education'] ?? []),
            $profile['graduationYear'] ?? 2025,
            json_encode($profile['social'] ?? []),
            json_encode($profile['skills'] ?? []),
            json_encode($profile['projects'] ?? []),
        ]);
    };

    // Seed initial data only if users table empty
    $cnt = $db->query('SELECT COUNT(*) as c FROM users')->fetch(PDO::FETCH_ASSOC)['c'] ?? 0;
    if ($cnt == 0) {
        // Insert sample users
        $stmt = $db->prepare('INSERT INTO users (name,email,password,role,firstName,lastName,age,jobTitle,location,skills,schoolId,companyId,profileJson) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
        $seededStudents = [
            [
                'name' => 'Alice Martin',
                'email' => 'alice.martin@example.com',
                'firstName' => 'Alice',
                'lastName' => 'Martin',
                'age' => 21,
                'jobTitle' => 'Développeuse Frontend',
                'location' => 'Paris',
                'skills' => [['name' => 'React', 'level' => 'Avancé'], ['name' => 'TypeScript', 'level' => 'Intermédiaire']],
                'headline' => 'Étudiante orientée produit et interfaces web.',
                'bio' => 'J’aime construire des interfaces propres, rapides et utiles, avec un vrai sens du détail.',
                'projects' => [
                    ['name' => 'Campus Connect', 'description' => 'Plateforme d’échange pour projets étudiants et retours de stage.', 'link' => ''],
                    ['name' => 'Design System Lite', 'description' => 'Bibliothèque de composants simple et cohérente pour des apps internes.', 'link' => ''],
                ],
            ],
            [
                'name' => 'Hugo Bernard',
                'email' => 'hugo.bernard@example.com',
                'firstName' => 'Hugo',
                'lastName' => 'Bernard',
                'age' => 22,
                'jobTitle' => 'Développeur Fullstack',
                'location' => 'Lyon',
                'skills' => [['name' => 'Node.js', 'level' => 'Avancé'], ['name' => 'React', 'level' => 'Intermédiaire'], ['name' => 'SQL', 'level' => 'Intermédiaire']],
                'headline' => 'Alternant fullstack, à l’aise sur la logique métier et l’UI.',
                'bio' => 'Je relie front et back pour livrer des produits simples à utiliser et faciles à faire évoluer.',
                'projects' => [
                    ['name' => 'TaskFlow', 'description' => 'Mini outil de suivi de tâches avec authentification et filtres.', 'link' => ''],
                    ['name' => 'Job Radar', 'description' => 'Agrégateur d’offres avec classement par pertinence.', 'link' => ''],
                ],
            ],
            [
                'name' => 'Clément Hubert',
                'email' => 'clement.hubert@ecole-hexagone.com',
                'firstName' => 'Clément',
                'lastName' => 'Hubert',
                'age' => 23,
                'jobTitle' => 'UI Engineer',
                'location' => 'Nantes',
                'skills' => [['name' => 'Figma', 'level' => 'Avancé'], ['name' => 'CSS', 'level' => 'Avancé'], ['name' => 'React', 'level' => 'Intermédiaire']],
                'headline' => 'Profil interface, design systems et accessibilité.',
                'bio' => 'J’aime les interfaces soignées, lisibles et stables, avec une attention forte à l’ergonomie.',
                'projects' => [
                    ['name' => 'Hexa UI Kit', 'description' => 'Kit de composants pour harmoniser les écrans de la plateforme.', 'link' => ''],
                    ['name' => 'Portfolio Atelier', 'description' => 'Portfolio interactif pensé pour les recruteurs.', 'link' => ''],
                ],
            ],
        ];

        // company / reference user
        $stmt->execute(['Acme Corp','hr@acme.example',password_hash('password', PASSWORD_DEFAULT),'company', null, null, null, null, null, null, null, null, json_encode(['headline' => 'Entreprise partenaire de démonstration', 'bio' => 'Acme Corp sert de point d’ancrage pour les parcours étudiants.'])]);
        $companyId = $db->lastInsertId();

        // school
        $db->exec("INSERT INTO schools (name,slug,description,website,location) VALUES ('École XYZ','ecole-xyz','École d''ingénieurs','https://ecole.example','Paris')");
        $schoolId = $db->lastInsertId();

        foreach ($seededStudents as $student) {
            $profileJson = json_encode([
                'headline' => $student['headline'],
                'bio' => $student['bio'],
                'projects' => $student['projects'],
            ]);
            $stmt->execute([
                $student['name'],
                $student['email'],
                password_hash('password', PASSWORD_DEFAULT),
                'student',
                $student['firstName'],
                $student['lastName'],
                $student['age'],
                $student['jobTitle'],
                $student['location'],
                json_encode($student['skills']),
                $schoolId,
                $companyId,
                $profileJson,
            ]);
            $studentId = $db->lastInsertId();

            $sp = $db->prepare('INSERT INTO student_profiles (user_id,headline,location,bio,phone,portfolio,availability,linkedin,desired_roles_json,education_json,graduation_year,social_json,skills_json,projects_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
            $sp->execute([
                $studentId,
                $student['headline'],
                $student['location'],
                $student['bio'],
                '+33 6 12 34 56 78',
                'https://portfolio.example.com/' . strtolower($student['firstName']),
                'Immédiate',
                'https://linkedin.com/in/' . strtolower($student['firstName']),
                json_encode([$student['jobTitle'], 'Alternance']),
                json_encode([['school' => 'École XYZ', 'degree' => 'Licence', 'year' => 2025]]),
                2025,
                json_encode([]),
                json_encode($student['skills']),
                json_encode($student['projects'])
            ]);
        }

        // school
        // Note: escape single quotes inside SQL string (École d''ingénieurs)

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

    // Add or refresh the demo student profiles even when the DB already exists.
    $companyId = $ensureUserByEmail([
        'name' => 'Acme Corp',
        'email' => 'hr@acme.example',
        'password' => 'password',
        'role' => 'company',
        'profileJson' => json_encode(['headline' => 'Entreprise partenaire de démonstration', 'bio' => 'Acme Corp sert de point d’ancrage pour les parcours étudiants.']),
    ]);
    $schoolId = $ensureSchool('École XYZ', 'ecole-xyz', "École d'ingénieurs", 'https://ecole.example', 'Paris');

    $extraStudents = [
        [
            'name' => 'Alice Martin',
            'email' => 'alice.martin@example.com',
            'firstName' => 'Alice',
            'lastName' => 'Martin',
            'age' => 21,
            'jobTitle' => 'Développeuse Frontend',
            'location' => 'Paris',
            'skills' => [['name' => 'React', 'level' => 'Avancé'], ['name' => 'TypeScript', 'level' => 'Intermédiaire']],
            'headline' => 'Étudiante orientée produit et interfaces web.',
            'bio' => 'J’aime construire des interfaces propres, rapides et utiles, avec un vrai sens du détail.',
            'projects' => [
                ['name' => 'Campus Connect', 'description' => 'Plateforme d’échange pour projets étudiants et retours de stage.', 'link' => ''],
                ['name' => 'Design System Lite', 'description' => 'Bibliothèque de composants simple et cohérente pour des apps internes.', 'link' => ''],
            ],
        ],
        [
            'name' => 'Hugo Bernard',
            'email' => 'hugo.bernard@example.com',
            'firstName' => 'Hugo',
            'lastName' => 'Bernard',
            'age' => 22,
            'jobTitle' => 'Développeur Fullstack',
            'location' => 'Lyon',
            'skills' => [['name' => 'Node.js', 'level' => 'Avancé'], ['name' => 'React', 'level' => 'Intermédiaire'], ['name' => 'SQL', 'level' => 'Intermédiaire']],
            'headline' => 'Alternant fullstack, à l’aise sur la logique métier et l’UI.',
            'bio' => 'Je relie front et back pour livrer des produits simples à utiliser et faciles à faire évoluer.',
            'projects' => [
                ['name' => 'TaskFlow', 'description' => 'Mini outil de suivi de tâches avec authentification et filtres.', 'link' => ''],
                ['name' => 'Job Radar', 'description' => 'Agrégateur d’offres avec classement par pertinence.', 'link' => ''],
            ],
        ],
        [
            'name' => 'Clément Hubert',
            'email' => 'clement.hubert@ecole-hexagone.com',
            'firstName' => 'Clément',
            'lastName' => 'Hubert',
            'age' => 23,
            'jobTitle' => 'UI Engineer',
            'location' => 'Nantes',
            'skills' => [['name' => 'Figma', 'level' => 'Avancé'], ['name' => 'CSS', 'level' => 'Avancé'], ['name' => 'React', 'level' => 'Intermédiaire']],
            'headline' => 'Profil interface, design systems et accessibilité.',
            'bio' => 'J’aime les interfaces soignées, lisibles et stables, avec une attention forte à l’ergonomie.',
            'projects' => [
                ['name' => 'Hexa UI Kit', 'description' => 'Kit de composants pour harmoniser les écrans de la plateforme.', 'link' => ''],
                ['name' => 'Portfolio Atelier', 'description' => 'Portfolio interactif pensé pour les recruteurs.', 'link' => ''],
                ],
            ],
        [
            'name' => 'Inès Laurent',
            'email' => 'ines.laurent@example.com',
            'firstName' => 'Inès',
            'lastName' => 'Laurent',
            'age' => 20,
            'jobTitle' => 'Développeuse Web',
            'location' => 'Rennes',
            'skills' => [['name' => 'Vue.js', 'level' => 'Intermédiaire'], ['name' => 'CSS', 'level' => 'Avancé'], ['name' => 'Git', 'level' => 'Intermédiaire']],
            'headline' => 'Étudiante motivée par les interfaces simples et efficaces.',
            'bio' => 'Je construis des interfaces claires avec une attention particulière à la lisibilité et aux détails visuels.',
            'projects' => [
                ['name' => 'Agenda Campus', 'description' => 'Application de suivi des événements étudiants et des deadlines.', 'link' => ''],
                ['name' => 'Portfolio Minimal', 'description' => 'Portfolio léger avec mise en avant du contenu et des projets.', 'link' => ''],
            ],
        ],
        [
            'name' => 'Malo Petit',
            'email' => 'malo.petit@example.com',
            'firstName' => 'Malo',
            'lastName' => 'Petit',
            'age' => 24,
            'jobTitle' => 'Intégrateur Frontend',
            'location' => 'Bordeaux',
            'skills' => [['name' => 'HTML', 'level' => 'Avancé'], ['name' => 'Tailwind', 'level' => 'Intermédiaire'], ['name' => 'React', 'level' => 'Intermédiaire']],
            'headline' => 'Profil orienté intégration rapide et composants réutilisables.',
            'bio' => 'J’aime transformer une maquette en interface nette, robuste et agréable à parcourir.',
            'projects' => [
                ['name' => 'UI Sprint', 'description' => 'Sprint de conversion de maquettes en pages responsives.', 'link' => ''],
                ['name' => 'BookList', 'description' => 'Mini site de gestion de lectures avec filtres et favoris.', 'link' => ''],
            ],
        ],
        [
            'name' => 'Sarah Diallo',
            'email' => 'sarah.diallo@example.com',
            'firstName' => 'Sarah',
            'lastName' => 'Diallo',
            'age' => 22,
            'jobTitle' => 'Développeuse Fullstack',
            'location' => 'Lille',
            'skills' => [['name' => 'Node.js', 'level' => 'Intermédiaire'], ['name' => 'React', 'level' => 'Avancé'], ['name' => 'API REST', 'level' => 'Intermédiaire']],
            'headline' => 'Alternante fullstack à l’aise sur les projets d’équipe.',
            'bio' => 'J’aime les projets qui mélangent logique métier, rigueur technique et interface fluide.',
            'projects' => [
                ['name' => 'MatchBoard', 'description' => 'Tableau de bord pour faire le lien entre offres et profils.', 'link' => ''],
                ['name' => 'Mini CRM', 'description' => 'Outil léger de suivi d’activités avec filtres et actions rapides.', 'link' => ''],
            ],
        ],
        [
            'name' => 'Yanis Morel',
            'email' => 'yanis.morel@example.com',
            'firstName' => 'Yanis',
            'lastName' => 'Morel',
            'age' => 23,
            'jobTitle' => 'Designer UI',
            'location' => 'Toulouse',
            'skills' => [['name' => 'Figma', 'level' => 'Avancé'], ['name' => 'Accessibilité', 'level' => 'Intermédiaire'], ['name' => 'Motion', 'level' => 'Débutant']],
            'headline' => 'Profil créatif avec un vrai soin pour les parcours utilisateurs.',
            'bio' => 'Je conçois des interfaces qui racontent quelque chose tout en restant simples à lire et à utiliser.',
            'projects' => [
                ['name' => 'Event Space', 'description' => 'Interface événementielle avec navigation fluide et repères visuels.', 'link' => ''],
                ['name' => 'Brand System', 'description' => 'Base visuelle pour homogénéiser les écrans d’une petite plateforme.', 'link' => ''],
            ],
        ],
        [
            'name' => 'Nora Benali',
            'email' => 'nora.benali@example.com',
            'firstName' => 'Nora',
            'lastName' => 'Benali',
            'age' => 21,
            'jobTitle' => 'Développeuse Frontend',
            'location' => 'Montpellier',
            'skills' => [['name' => 'React', 'level' => 'Intermédiaire'], ['name' => 'TypeScript', 'level' => 'Intermédiaire'], ['name' => 'Tests', 'level' => 'Débutant']],
            'headline' => 'Étudiante sérieuse, curieuse et régulière dans sa progression.',
            'bio' => 'J’aime les projets concrets où l’on peut améliorer progressivement la qualité et la stabilité du code.',
            'projects' => [
                ['name' => 'Study Tracker', 'description' => 'Outil de suivi des révisions et des objectifs hebdomadaires.', 'link' => ''],
                ['name' => 'Component Lab', 'description' => 'Bac à sable pour tester et comparer des composants UI.', 'link' => ''],
            ],
        ],
        ];

    foreach ($extraStudents as $student) {
        $profileJson = json_encode([
            'headline' => $student['headline'],
            'bio' => $student['bio'],
            'projects' => $student['projects'],
        ]);

        $studentId = $ensureUserByEmail([
            'name' => $student['name'],
            'email' => $student['email'],
            'password' => 'password',
            'role' => 'student',
            'firstName' => $student['firstName'],
            'lastName' => $student['lastName'],
            'age' => $student['age'],
            'jobTitle' => $student['jobTitle'],
            'location' => $student['location'],
            'skills' => $student['skills'],
            'schoolId' => $schoolId,
            'companyId' => $companyId,
            'profileJson' => $profileJson,
        ]);

        $ensureStudentProfile($studentId, [
            'headline' => $student['headline'],
            'location' => $student['location'],
            'bio' => $student['bio'],
            'desiredRoles' => [$student['jobTitle'], 'Alternance'],
            'education' => [['school' => 'École XYZ', 'degree' => 'Licence', 'year' => 2025]],
            'graduationYear' => 2025,
            'skills' => $student['skills'],
            'projects' => $student['projects'],
            'portfolio' => 'https://portfolio.example.com/' . strtolower($student['firstName']),
            'linkedin' => 'https://linkedin.com/in/' . strtolower($student['firstName']),
        ]);
    }

    $db->commit();

    echo "SQLite database initialized at: $dbFile\n";
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    fwrite(STDERR, "Erreur: " . $e->getMessage() . "\n");
    exit(1);
}

return 0;
