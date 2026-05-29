<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260529105000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Seed schools, companies, jobs and attach students to a school.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("INSERT INTO school (name, location) SELECT 'Ecole Hexagone', 'Paris' WHERE NOT EXISTS (SELECT 1 FROM school WHERE name = 'Ecole Hexagone')");
        $this->addSql("INSERT INTO school (name, location) SELECT 'Ecole du Web', 'Lyon' WHERE NOT EXISTS (SELECT 1 FROM school WHERE name = 'Ecole du Web')");

        $this->addSql("INSERT INTO company (name, location) SELECT 'HexaCorp', 'Paris' WHERE NOT EXISTS (SELECT 1 FROM company WHERE name = 'HexaCorp')");
        $this->addSql("INSERT INTO company (name, location) SELECT 'WebSolutions', 'Nantes' WHERE NOT EXISTS (SELECT 1 FROM company WHERE name = 'WebSolutions')");

        $this->addSql("INSERT INTO job_offer (title, description, company_id) SELECT 'Frontend Developer', 'Conception et développement d''interfaces React.', c.id FROM company c WHERE c.name = 'HexaCorp' AND NOT EXISTS (SELECT 1 FROM job_offer j WHERE j.title = 'Frontend Developer' AND j.company_id = c.id)");
        $this->addSql("INSERT INTO job_offer (title, description, company_id) SELECT 'Backend Developer', 'API et intégration.', c.id FROM company c WHERE c.name = 'WebSolutions' AND NOT EXISTS (SELECT 1 FROM job_offer j WHERE j.title = 'Backend Developer' AND j.company_id = c.id)");

        $this->addSql("UPDATE student SET school_id = (SELECT id FROM school WHERE name = 'Ecole Hexagone' LIMIT 1) WHERE school_id IS NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("UPDATE student SET school_id = NULL");
        $this->addSql("DELETE FROM job_offer WHERE title IN ('Frontend Developer', 'Backend Developer')");
        $this->addSql("DELETE FROM company WHERE name IN ('HexaCorp', 'WebSolutions')");
        $this->addSql("DELETE FROM school WHERE name IN ('Ecole Hexagone', 'Ecole du Web')");
    }
}
