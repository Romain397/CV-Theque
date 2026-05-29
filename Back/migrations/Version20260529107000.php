<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260529107000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add shared tags and specialties to students, schools, companies and jobs.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE student ADD skills CLOB NOT NULL DEFAULT '[]'");
        $this->addSql("ALTER TABLE school ADD specialties CLOB NOT NULL DEFAULT '[]'");
        $this->addSql("ALTER TABLE company ADD specialties CLOB NOT NULL DEFAULT '[]'");
        $this->addSql("ALTER TABLE job_offer ADD tags CLOB NOT NULL DEFAULT '[]'");

        $this->addSql("UPDATE student SET skills = '[{\"name\":\"HTML\",\"level\":\"Avancé\"},{\"name\":\"CSS\",\"level\":\"Avancé\"},{\"name\":\"React\",\"level\":\"Intermédiaire\"}]' WHERE first_name = 'Lina' AND last_name = 'Morel'");
        $this->addSql("UPDATE student SET skills = '[{\"name\":\"Node.js\",\"level\":\"Intermédiaire\"},{\"name\":\"API\",\"level\":\"Intermédiaire\"},{\"name\":\"SQL\",\"level\":\"Débutant\"}]' WHERE first_name = 'Noah' AND last_name = 'Bernard'");
        $this->addSql("UPDATE student SET skills = '[{\"name\":\"UI / UX\",\"level\":\"Avancé\"},{\"name\":\"Figma\",\"level\":\"Avancé\"},{\"name\":\"Ateliers produit\",\"level\":\"Intermédiaire\"}]' WHERE first_name = 'Sarah' AND last_name = 'Petit'");
        $this->addSql("UPDATE student SET skills = '[{\"name\":\"Gestion de projet\",\"level\":\"Avancé\"},{\"name\":\"Agile\",\"level\":\"Avancé\"},{\"name\":\"Communication\",\"level\":\"Intermédiaire\"}]' WHERE first_name = 'Hugo' AND last_name = 'Leroy'");

        $this->addSql("UPDATE school SET specialties = '[\"Développement frontend\",\"UI / UX\",\"Cloud\",\"Culture produit\"]' WHERE name = 'Ecole Hexagone'");
        $this->addSql("UPDATE school SET specialties = '[\"JavaScript\",\"Frameworks modernes\",\"APIs\",\"Méthodes agiles\"]' WHERE name = 'Ecole du Web'");

        $this->addSql("UPDATE company SET specialties = '[\"Product design\",\"Frontend\",\"Backend API\",\"Data\"]' WHERE name = 'HexaCorp'");
        $this->addSql("UPDATE company SET specialties = '[\"Delivery agile\",\"Architecture web\",\"Intégration\",\"Support technique\"]' WHERE name = 'WebSolutions'");

        $this->addSql("UPDATE job_offer SET tags = '[\"React\",\"UI\",\"Frontend\"]' WHERE title = 'Frontend Developer'");
        $this->addSql("UPDATE job_offer SET tags = '[\"API\",\"Node.js\",\"Backend\"]' WHERE title = 'Backend Developer'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE job_offer DROP tags');
        $this->addSql('ALTER TABLE company DROP specialties');
        $this->addSql('ALTER TABLE school DROP specialties');
        $this->addSql('ALTER TABLE student DROP skills');
    }
}