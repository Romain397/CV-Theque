<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260529104000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add school, company and job_offer tables and link students to schools.';
    }

    public function up(Schema $schema): void
    {
        if (!$schema->hasTable('school')) {
            $table = $schema->createTable('school');
            $table->addColumn('id', 'integer', ['autoincrement' => true]);
            $table->addColumn('name', 'string', ['length' => 150]);
            $table->addColumn('location', 'string', ['length' => 150, 'notnull' => false]);
            $table->setPrimaryKey(['id']);
        }

        if (!$schema->hasTable('company')) {
            $table = $schema->createTable('company');
            $table->addColumn('id', 'integer', ['autoincrement' => true]);
            $table->addColumn('name', 'string', ['length' => 150]);
            $table->addColumn('location', 'string', ['length' => 150, 'notnull' => false]);
            $table->setPrimaryKey(['id']);
        }

        if (!$schema->hasTable('job_offer')) {
            $table = $schema->createTable('job_offer');
            $table->addColumn('id', 'integer', ['autoincrement' => true]);
            $table->addColumn('title', 'string', ['length' => 150]);
            $table->addColumn('description', 'text', ['notnull' => false]);
            $table->addColumn('company_id', 'integer');
            $table->setPrimaryKey(['id']);
            $table->addForeignKeyConstraint('company', ['company_id'], ['id'], ['onDelete' => 'CASCADE']);
        }

        $student = $schema->getTable('student');
        if (!$student->hasColumn('school_id')) {
            $student->addColumn('school_id', 'integer', ['notnull' => false]);
            $student->addForeignKeyConstraint('school', ['school_id'], ['id'], ['onDelete' => 'SET NULL']);
        }
    }

    public function down(Schema $schema): void
    {
        if ($schema->hasTable('job_offer')) {
            $schema->dropTable('job_offer');
        }

        if ($schema->hasTable('company')) {
            $schema->dropTable('company');
        }

        if ($schema->hasTable('school')) {
            $schema->dropTable('school');
        }

        if ($schema->hasTable('student')) {
            $student = $schema->getTable('student');
            if ($student->hasColumn('school_id')) {
                $student->dropColumn('school_id');
            }
        }
    }
}
