<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260529100551 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create the student table.';
    }

    public function up(Schema $schema): void
    {
        $table = $schema->createTable('student');
        $table->addColumn('id', 'integer', ['autoincrement' => true]);
        $table->addColumn('first_name', 'string', ['length' => 50]);
        $table->addColumn('last_name', 'string', ['length' => 50]);
        $table->addColumn('age', 'integer');
        $table->addColumn('job_title', 'string', ['length' => 100]);
        $table->addColumn('location', 'string', ['length' => 100]);
        $table->setPrimaryKey(['id']);
    }

    public function down(Schema $schema): void
    {
        $schema->dropTable('student');
    }
}
