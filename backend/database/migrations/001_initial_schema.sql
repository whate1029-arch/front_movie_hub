-- Migration: 001_initial_schema.sql
-- Description: Initial database schema for Movie Information Aggregation System
-- Created: 2024-01-01
-- Author: System

-- This migration creates the complete database schema for the movie aggregation system
-- including all tables, indexes, constraints, and initial data

BEGIN;

-- Check if migration has already been applied
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations') THEN
        IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = '001') THEN
            RAISE EXCEPTION 'Migration 001 has already been applied';
        END IF;
    END IF;
END $$;

-- Create schema_migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(10) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Apply the main schema from schema.sql
\i 'schema.sql'

-- Record this migration
INSERT INTO schema_migrations (version, description) 
VALUES ('001', 'Initial database schema with movies, people, users, and LLM integration');

COMMIT;