package queries

import (
	"database/sql"

	"baby-recorder/internal/models"
)

func GetDiapersByRange(sqlDB *sql.DB, start, end int64) ([]models.Diaper, error) {
	rows, err := sqlDB.Query(
		`SELECT id, type, color, consistency, hadRash, recordedAt, note, createdAt, updatedAt
		 FROM diaper WHERE recordedAt >= ? AND recordedAt <= ? ORDER BY recordedAt DESC`,
		start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return models.ScanDiapers(rows)
}

func GetAllDiapers(sqlDB *sql.DB) ([]models.Diaper, error) {
	rows, err := sqlDB.Query(
		`SELECT id, type, color, consistency, hadRash, recordedAt, note, createdAt, updatedAt
		 FROM diaper ORDER BY recordedAt DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return models.ScanDiapers(rows)
}

func InsertDiaper(db Execer, p *models.DiaperParams) error {
	colorVal := interface{}(nil)
	if p.Color != nil {
		colorVal = *p.Color
	}
	consistencyVal := interface{}(nil)
	if p.Consistency != nil {
		consistencyVal = *p.Consistency
	}

	_, err := db.Exec(
		`INSERT INTO diaper (id, type, color, consistency, hadRash, recordedAt, note, createdAt, updatedAt)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET
		 type=excluded.type, color=excluded.color, consistency=excluded.consistency,
		 hadRash=excluded.hadRash, recordedAt=excluded.recordedAt, note=excluded.note,
		 updatedAt=excluded.updatedAt`,
		p.ID, p.Type, colorVal, consistencyVal, p.HadRash,
		p.RecordedAt, p.Note, p.CreatedAt, p.UpdatedAt,
	)
	return err
}

func DeleteDiaper(sqlDB *sql.DB, id string) error {
	_, err := sqlDB.Exec("DELETE FROM diaper WHERE id = ?", id)
	return err
}
