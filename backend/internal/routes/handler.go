package routes

import (
	"database/sql"
	"encoding/json"
	"io"
	"mime"
	"net/http"
	"strings"
	"strconv"
	"time"

	"baby-recorder/internal/models"
	"baby-recorder/internal/queries"
	"baby-recorder/internal/web"
	"github.com/google/uuid"
)

func init() {
	mime.AddExtensionType(".webmanifest", "application/manifest+json")
	mime.AddExtensionType(".json", "application/json")
}

func Register(mux *http.ServeMux, sqlDB *sql.DB) {
	nowMs := func() int64 { return time.Now().UnixMilli() }
	distFS := web.MustFS()

	mux.HandleFunc("GET /api/feedings", func(w http.ResponseWriter, r *http.Request) {
		start := qInt64(r.URL.Query().Get("start"), 0)
		end := maxInt64(r.URL.Query().Get("end"))
		list, err := queries.GetFeedingsByRange(sqlDB, start, end)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, list)
	})

	mux.HandleFunc("POST /api/feedings", func(w http.ResponseWriter, r *http.Request) {
		createFeeding(sqlDB, w, r, nowMs)
	})

	mux.HandleFunc("DELETE /api/feedings/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
			return
		}
		id := r.URL.Path[len("/api/feedings/"):]
		if id == "" {
			http.Error(w, "missing id", http.StatusBadRequest)
			return
		}
		if err := queries.DeleteFeeding(sqlDB, id); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	mux.HandleFunc("GET /api/diapers", func(w http.ResponseWriter, r *http.Request) {
		start := qInt64(r.URL.Query().Get("start"), 0)
		end := maxInt64(r.URL.Query().Get("end"))
		list, err := queries.GetDiapersByRange(sqlDB, start, end)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, list)
	})

	mux.HandleFunc("POST /api/diapers", func(w http.ResponseWriter, r *http.Request) {
		createDiaper(sqlDB, w, r, nowMs)
	})

	mux.HandleFunc("DELETE /api/diapers/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
			return
		}
		id := r.URL.Path[len("/api/diapers/"):]
		if id == "" {
			http.Error(w, "missing id", http.StatusBadRequest)
			return
		}
		if err := queries.DeleteDiaper(sqlDB, id); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	mux.HandleFunc("POST /api/sync/push", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
			return
		}
		syncPush(sqlDB, w, r)
	})

mux.HandleFunc("GET /api/sync/pull", func(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}
	syncPull(sqlDB, w, r)
})

mux.HandleFunc("GET /api/export", func(w http.ResponseWriter, r *http.Request) {
	feedings, err := queries.GetAllFeedings(sqlDB)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	diapers, err := queries.GetDiapersByRange(sqlDB, 0, maxInt64(""))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	data := map[string]interface{}{
		"feedings": feedings,
		"diapers":  diapers,
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=baby-recorder-backup.json")
	_ = json.NewEncoder(w).Encode(data)
})

mux.HandleFunc("POST /api/import", func(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}
	tx, err := sqlDB.Begin()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var payload struct {
		Feedings []map[string]interface{} `json:"feedings"`
		Diapers  []map[string]interface{} `json:"diapers"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	nowMs := time.Now().UnixMilli()
	count := 0

	for _, f := range payload.Feedings {
		feed := models.Feeding{Note: getString(f, "note", "")}
		if t, ok := f["type"].(string); ok {
			feed.Type = t
		}
		if a, ok := f["amount"]; ok && a != nil {
			feed.Amount = intPtr(int(a.(float64)))
		}
		if d, ok := f["durationSec"]; ok && d != nil {
			feed.DurationSec = intPtr(int(d.(float64)))
		}
		if s, ok := f["startedAt"].(float64); ok {
			feed.StartedAt = int64(s)
		}
		if e, ok := f["endedAt"]; ok && e != nil {
			feed.EndedAt = int64Ptr(int64(e.(float64)))
		}
		if c, ok := f["createdAt"].(float64); ok {
			feed.CreatedAt = int64(c)
		} else {
			feed.CreatedAt = nowMs
		}
		if u, ok := f["updatedAt"].(float64); ok {
			feed.UpdatedAt = int64(u)
		} else {
			feed.UpdatedAt = nowMs
		}
		if i, ok := f["id"].(string); ok && i != "" {
			feed.ID = i
		} else {
			feed.ID = uuid.New().String()
		}
		if err := queries.InsertFeeding(tx, &feed); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		count++
	}

	for _, d := range payload.Diapers {
		dp := models.DiaperParams{Note: getString(d, "note", "")}
		if t, ok := d["type"].(string); ok {
			dp.Type = t
		}
		if c, ok := d["color"]; ok && c != nil {
			v := c.(string)
			dp.Color = &v
		}
		if cs, ok := d["consistency"]; ok && cs != nil {
			v := cs.(string)
			dp.Consistency = &v
		}
		if h, ok := d["hadRash"]; ok && h != nil {
			switch v := h.(type) {
			case bool:
				if v {
					dp.HadRash = 1
				}
			case float64:
				if v != 0 {
					dp.HadRash = 1
				}
			}
		}
		if ra, ok := d["recordedAt"].(float64); ok {
			dp.RecordedAt = int64(ra)
		}
		if ca, ok := d["createdAt"].(float64); ok {
			dp.CreatedAt = int64(ca)
		} else {
			dp.CreatedAt = nowMs
		}
		if ua, ok := d["updatedAt"].(float64); ok {
			dp.UpdatedAt = int64(ua)
		} else {
			dp.UpdatedAt = nowMs
		}
		if i, ok := d["id"].(string); ok && i != "" {
			dp.ID = i
		} else {
			dp.ID = uuid.New().String()
		}
		if err := queries.InsertDiaper(tx, &dp); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		count++
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"ok": true, "imported": count})
})

	mux.HandleFunc("GET /api/settings", func(w http.ResponseWriter, r *http.Request) {
		settings, err := queries.GetAllSettings(sqlDB)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if settings == nil {
			settings = map[string]string{}
		}
		writeJSON(w, http.StatusOK, settings)
	})

	mux.HandleFunc("PUT /api/settings", func(w http.ResponseWriter, r *http.Request) {
		var body map[string]string
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		n := nowMs()
		tx, err := sqlDB.Begin()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer tx.Rollback()
		for k, v := range body {
			if err := queries.SetSetting(tx, k, v, n); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
		if err := tx.Commit(); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
	})

	mux.HandleFunc("/", serveStaticOrFallback(distFS))
}

func serveStaticOrFallback(distFS http.FileSystem) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		if len(r.URL.Path) >= 4 && r.URL.Path[:4] == "/api" {
			http.NotFound(w, r)
			return
		}
		requestedPath := r.URL.Path
		if requestedPath == "/" || requestedPath == "" {
			requestedPath = "/index.html"
		}
		f, err := distFS.Open(requestedPath)
		if err == nil {
			defer f.Close()
			info, statErr := f.Stat()
			if statErr == nil && !info.IsDir() {
				// Cache-bust: no-cache for HTML, long cache for hashed assets
				if requestedPath == "/index.html" || requestedPath == "/manifest.webmanifest" {
					w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
					w.Header().Set("Pragma", "no-cache")
					w.Header().Set("Expires", "0")
				} else if requestedPath == "/registerSW.js" || requestedPath == "/sw.js" || requestedPath == "/workbox-*.js" {
					w.Header().Set("Cache-Control", "no-cache")
				} else {
					w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
				}
				http.ServeContent(w, r, info.Name(), info.ModTime(), f.(io.ReadSeeker))
				return
			}
		}
		// Don't fallback to index.html for asset paths — return 404 so the
		// browser doesn't receive an HTML document when it expects JS/CSS.
		if strings.HasPrefix(requestedPath, "/assets/") ||
			strings.HasPrefix(requestedPath, "/sw.") ||
			strings.HasPrefix(requestedPath, "/workbox-") {
			http.NotFound(w, r)
			return
		}
		idx, err2 := distFS.Open("/index.html")
		if err2 == nil {
			defer idx.Close()
			info, _ := idx.Stat()
			w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
			w.Header().Set("Pragma", "no-cache")
			w.Header().Set("Expires", "0")
			http.ServeContent(w, r, "index.html", info.ModTime(), idx.(io.ReadSeeker))
		} else {
			http.NotFound(w, r)
		}
	}
}

func createFeeding(sqlDB *sql.DB, w http.ResponseWriter, r *http.Request, nowMs func() int64) {
	var body struct {
		Type        string    `json:"type"`
		Amount      *float64  `json:"amount"`
		DurationSec *float64  `json:"durationSec"`
		StartedAt   *float64  `json:"startedAt"`
		EndedAt     *float64  `json:"endedAt"`
		Note        string    `json:"note"`
		CreatedAt   int64     `json:"createdAt"`
		UpdatedAt   int64     `json:"updatedAt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if body.CreatedAt == 0 {
		body.CreatedAt = nowMs()
	}
	if body.UpdatedAt == 0 {
		body.UpdatedAt = nowMs()
	}
	var amount *int
	if body.Amount != nil {
		v := int(*body.Amount)
		amount = &v
	}
	var dur *int
	if body.DurationSec != nil {
		v := int(*body.DurationSec)
		dur = &v
	}
	startedAt := int64(0)
	if body.StartedAt != nil {
		startedAt = int64(*body.StartedAt)
	}
	var endedAt *int64
	if body.EndedAt != nil {
		v := int64(*body.EndedAt)
		endedAt = &v
	}
	f := &models.Feeding{
		ID: uuid.New().String(), Type: body.Type, Amount: amount, DurationSec: dur,
		StartedAt: startedAt, EndedAt: endedAt, Note: body.Note,
		CreatedAt: body.CreatedAt, UpdatedAt: body.UpdatedAt,
	}
	if err := queries.InsertFeeding(sqlDB, f); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"id": f.ID})
}

func createDiaper(sqlDB *sql.DB, w http.ResponseWriter, r *http.Request, nowMs func() int64) {
	var m map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	createdAt := nowMs()
	updatedAt := nowMs()
	if ca, ok := m["createdAt"].(float64); ok {
		createdAt = int64(ca)
	}
	if ua, ok := m["updatedAt"].(float64); ok {
		updatedAt = int64(ua)
	}
	dp := models.DiaperParams{
		Note: getString(m, "note", ""), CreatedAt: createdAt, UpdatedAt: updatedAt,
	}
	if t, ok := m["type"].(string); ok {
		dp.Type = t
	}
	if c, ok := m["color"]; ok && c != nil {
		v := c.(string)
		dp.Color = &v
	}
	if cs, ok := m["consistency"]; ok && cs != nil {
		v := cs.(string)
		dp.Consistency = &v
	}
	if h, ok := m["hadRash"]; ok && h != nil {
		switch v := h.(type) {
		case bool:
			if v {
				dp.HadRash = 1
			}
		case float64:
			if v != 0 {
				dp.HadRash = 1
			}
		}
	}
	if ra, ok := m["recordedAt"].(float64); ok {
		dp.RecordedAt = int64(ra)
	}
	if dp.ID == "" || m["id"] == nil {
		dp.ID = uuid.New().String()
	} else if s, ok := m["id"].(string); ok && s != "" {
		dp.ID = s
	}
	if err := queries.InsertDiaper(sqlDB, &dp); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"id": dp.ID})
}

func syncPush(sqlDB *sql.DB, w http.ResponseWriter, r *http.Request) {
	var body struct {
		Feedings []map[string]interface{} `json:"feedings"`
		Diapers  []map[string]interface{} `json:"diapers"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	for _, f := range body.Feedings {
		feed := models.Feeding{Note: getString(f, "note", "")}
		if t, ok := f["type"].(string); ok {
			feed.Type = t
		}
		if a, ok := f["amount"]; ok && a != nil {
			feed.Amount = intPtr(int(a.(float64)))
		}
		if d, ok := f["durationSec"]; ok && d != nil {
			feed.DurationSec = intPtr(int(d.(float64)))
		}
		if s, ok := f["startedAt"].(float64); ok {
			feed.StartedAt = int64(s)
		}
		if e, ok := f["endedAt"]; ok && e != nil {
			feed.EndedAt = int64Ptr(int64(e.(float64)))
		}
		if c, ok := f["createdAt"].(float64); ok {
			feed.CreatedAt = int64(c)
		}
		if u, ok := f["updatedAt"].(float64); ok {
			feed.UpdatedAt = int64(u)
		}
		if i, ok := f["id"].(string); ok && i != "" {
			feed.ID = i
		} else {
			feed.ID = uuid.New().String()
		}
		
		_ = queries.InsertFeeding(sqlDB, &feed)
	}
	for _, d := range body.Diapers {
		dp := models.DiaperParams{Note: getString(d, "note", "")}
		if t, ok := d["type"].(string); ok {
			dp.Type = t
		}
		if c, ok := d["color"]; ok && c != nil {
			v := c.(string)
			dp.Color = &v
		}
		if cs, ok := d["consistency"]; ok && cs != nil {
			v := cs.(string)
			dp.Consistency = &v
		}
		if h, ok := d["hadRash"]; ok && h != nil {
			switch v := h.(type) {
			case bool:
				if v {
					dp.HadRash = 1
				}
			case float64:
				if v != 0 {
					dp.HadRash = 1
				}
			}
		}
		if ra, ok := d["recordedAt"].(float64); ok {
			dp.RecordedAt = int64(ra)
		}
		if c, ok := d["createdAt"].(float64); ok {
			dp.CreatedAt = int64(c)
		}
		if u, ok := d["updatedAt"].(float64); ok {
			dp.UpdatedAt = int64(u)
		}
		if i, ok := d["id"].(string); ok && i != "" {
			dp.ID = i
		} else {
			dp.ID = uuid.New().String()
		}
		_ = queries.InsertDiaper(sqlDB, &dp)
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func syncPull(sqlDB *sql.DB, w http.ResponseWriter, r *http.Request) {
	since := qInt64(r.URL.Query().Get("since"), 0)
	feedings, _ := queries.GetAllFeedings(sqlDB)
	diapers, _ := queries.GetAllDiapers(sqlDB)
	var newFeeds []models.Feeding
	for _, f := range feedings {
		if f.UpdatedAt > since {
			newFeeds = append(newFeeds, f)
		}
	}
	var newDiaps []models.Diaper
	for _, d := range diapers {
		if d.UpdatedAt > since {
			newDiaps = append(newDiaps, d)
		}
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"feedings": newFeeds, "diapers": newDiaps})
}

func maxInt64(s string) int64 {
	if s == "" {
		return int64(^uint64(0) >> 1)
	}
	n, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return int64(^uint64(0) >> 1)
	}
	return n
}

func qInt64(s string, def int64) int64 {
	if s == "" {
		return def
	}
	n, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return def
	}
	return n
}

func intPtr(v int) *int       { return &v }
func int64Ptr(v int64) *int64 { return &v }

func getString(m map[string]interface{}, key, def string) string {
	if v, ok := m[key]; ok && v != nil {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return def
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
