<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260529106000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add optional company relation to students and seed a few company links.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE student ADD company_id INT DEFAULT NULL');
        $this->addSql('CREATE INDEX IDX_3B5E70A5979B1AD6 ON student (company_id)');
        $this->addSql("UPDATE student SET company_id = (SELECT id FROM company WHERE name = 'HexaCorp' LIMIT 1) WHERE first_name = 'Lina' AND last_name = 'Morel'");
        $this->addSql("UPDATE student SET company_id = (SELECT id FROM company WHERE name = 'WebSolutions' LIMIT 1) WHERE first_name = 'Noah' AND last_name = 'Bernard'");
        $this->addSql("UPDATE student SET company_id = (SELECT id FROM company WHERE name = 'HexaCorp' LIMIT 1) WHERE first_name = 'Sarah' AND last_name = 'Petit'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('UPDATE student SET company_id = NULL');
        $this->addSql('DROP INDEX IDX_3B5E70A5979B1AD6');
        $this->addSql('ALTER TABLE student DROP company_id');
    }
}
