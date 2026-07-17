package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

func Init(dbPath string) (*sql.DB, error) {
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}

	sqlDB, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	if _, err := sqlDB.Exec("PRAGMA journal_mode=WAL"); err != nil {
		return nil, fmt.Errorf("enable WAL: %w", err)
	}

	if _, err := sqlDB.Exec(Schema); err != nil {
		sqlDB.Close()
		return nil, fmt.Errorf("create schema: %w", err)
	}

	return sqlDB, nil
}

const Schema = `
CREATE TABLE IF NOT EXISTS feeding (
	id TEXT PRIMARY KEY,
	type TEXT NOT NULL,
	amount INTEGER,
	durationSec INTEGER,
	startedAt INTEGER NOT NULL,
	endedAt INTEGER,
	note TEXT DEFAULT '',
	createdAt INTEGER NOT NULL,
	updatedAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS diaper (
	id TEXT PRIMARY KEY,
	type TEXT NOT NULL,
	color TEXT,
	consistency TEXT,
	hadRash INTEGER DEFAULT 0,
	recordedAt INTEGER NOT NULL,
	note TEXT DEFAULT '',
	createdAt INTEGER NOT NULL,
	updatedAt INTEGER NOT NULL
);
	CREATE INDEX IF NOT EXISTS idx_f_ts ON feeding(startedAt);
	CREATE INDEX IF NOT EXISTS idx_d_ts ON diaper(recordedAt);
	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL,
		updatedAt INTEGER NOT NULL
	);
	`
