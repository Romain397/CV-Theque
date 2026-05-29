<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260529103000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Seed a few demo students for the homepage list.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
INSERT INTO student (first_name, last_name, age, job_title, location)
SELECT 'Lina', 'Morel', 22, 'Développeuse Frontend', 'Paris'
WHERE NOT EXISTS (
    SELECT 1 FROM student WHERE first_name = 'Lina' AND last_name = 'Morel'
)
SQL);

        $this->addSql(<<<'SQL'
INSERT INTO student (first_name, last_name, age, job_title, location)
SELECT 'Noah', 'Bernard', 24, 'Développeur Full Stack', 'Lyon'
WHERE NOT EXISTS (
    SELECT 1 FROM student WHERE first_name = 'Noah' AND last_name = 'Bernard'
)
SQL);

        $this->addSql(<<<'SQL'
INSERT INTO student (first_name, last_name, age, job_title, location)
SELECT 'Sarah', 'Petit', 23, 'UX/UI Designer', 'Nantes'
WHERE NOT EXISTS (
    SELECT 1 FROM student WHERE first_name = 'Sarah' AND last_name = 'Petit'
)
SQL);

        $this->addSql(<<<'SQL'
INSERT INTO student (first_name, last_name, age, job_title, location)
SELECT 'Hugo', 'Leroy', 25, 'Chef de projet digital', 'Bordeaux'
WHERE NOT EXISTS (
    SELECT 1 FROM student WHERE first_name = 'Hugo' AND last_name = 'Leroy'
)
SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql("DELETE FROM student WHERE (first_name = 'Lina' AND last_name = 'Morel') OR (first_name = 'Noah' AND last_name = 'Bernard') OR (first_name = 'Sarah' AND last_name = 'Petit') OR (first_name = 'Hugo' AND last_name = 'Leroy')");
    }
}