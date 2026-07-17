package queries

import "database/sql"

func GetAllSettings(db *sql.DB) (map[string]string, error) {
	rows, err := db.Query("SELECT key, value FROM settings")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		result[k] = v
	}
	return result, rows.Err()
}

func SetSetting(db Execer, key, value string, updatedAt int64) error {
	_, err := db.Exec(
		`INSERT INTO settings (key, value, updatedAt) VALUES (?, ?, ?)
		 ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=excluded.updatedAt`,
		key, value, updatedAt,
	)
	return err
}
