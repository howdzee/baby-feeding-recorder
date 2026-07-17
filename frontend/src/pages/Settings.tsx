import { useState, useEffect } from 'react'
import { Bell, Trash2, Download, Upload, Baby, FileSpreadsheet, Table, Database } from 'lucide-react'
import StatCard from '../components/StatCard'
import useRecords from '../store/useRecords'
import { fetchSettings, saveSettingsOnServer } from '../db'

interface AppSettings {
  babyName: string
  babyBirthday: string
  reminderEnabled: boolean
  reminderInterval: number
  quietStart: string
  quietEnd: string
}

const defaults: AppSettings = {
  babyName: '',
  babyBirthday: '',
  reminderEnabled: false,
  reminderInterval: 3,
  quietStart: '22:00',
  quietEnd: '06:00',
}

function serialize(s: AppSettings): Record<string, string> {
  return {
    babyName: s.babyName,
    babyBirthday: s.babyBirthday,
    reminderEnabled: String(s.reminderEnabled),
    reminderInterval: String(s.reminderInterval),
    quietStart: s.quietStart,
    quietEnd: s.quietEnd,
  }
}

function deserialize(raw: Record<string, string>): AppSettings {
  return {
    babyName: raw.babyName ?? defaults.babyName,
    babyBirthday: raw.babyBirthday ?? defaults.babyBirthday,
    reminderEnabled: raw.reminderEnabled === 'true',
    reminderInterval: raw.reminderInterval ? Number(raw.reminderInterval) : defaults.reminderInterval,
    quietStart: raw.quietStart ?? defaults.quietStart,
    quietEnd: raw.quietEnd ?? defaults.quietEnd,
  }
}

function isQuietHours(s: AppSettings): boolean {
  if (!s.reminderEnabled) return true
  const now = new Date()
  const [qh, qm] = s.quietStart.split(':').map(Number)
  const [eh, em] = s.quietEnd.split(':').map(Number)
  const quietStartMin = qh * 60 + qm
  const quietEndMin = eh * 60 + em
  const nowMin = now.getHours() * 60 + now.getMinutes()
  if (quietStartMin > quietEndMin) {
    return nowMin >= quietStartMin || nowMin < quietEndMin
  }
  return nowMin >= quietStartMin && nowMin < quietEndMin
}

export default function Settings() {
  const store = useRecords()
  const [settings, setSettings] = useState<AppSettings>({ ...defaults })
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Load settings from server on mount
  useEffect(() => {
    (async () => {
      try {
        const server = await fetchSettings()
        if (server && Object.keys(server).length > 0) {
          setSettings({ ...defaults, ...deserialize(server) })
        }
        // If server returns empty, keep defaults — no localStorage fallback
      } catch {
        setError(true)
        setSettings({ ...defaults })
      }
      setLoading(false)
    })()
  }, [])

  // Save to server on every change (skip initial mount)
  useEffect(() => {
    if (loading) return
    saveSettingsOnServer(serialize(settings)).catch(() => {})
  }, [settings, loading])

  const update = (patch: Partial<AppSettings>) =>
    setSettings((prev) => ({ ...prev, ...patch }))

  // --- Record backup (SQLite blob) / restore ---
  const exportData = async () => {
    setBusy(true)
    try {
      const { exportDB } = await import('../db')
      const buf = await exportDB()
      const blob = new Blob([buf], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `baby-recorder-backup-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm('恢复数据将替换当前所有记录和设置。确定继续？')) {
      e.target.value = ''; return
    }
    setBusy(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const { importDB } = await import('../db')
          await importDB(new Uint8Array(reader.result as ArrayBuffer))
          alert('数据恢复成功')
          window.location.reload()
        } catch {
          alert('导入失败')
        } finally {
          setBusy(false)
        }
      }
      reader.readAsArrayBuffer(file)
    } catch { setBusy(false) }
    e.target.value = ''
  }

  // --- Excel export / import ---
  const exportXlsx = async () => {
    setBusy(true)
    try {
      const { exportXlsx: doExport } = await import('../db')
      await doExport()
    } catch {
      alert('导出 Excel 失败')
    } finally {
      setBusy(false)
    }
  }

  const importXlsxHandler = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm('导入 Excel 将清空并替换当前所有记录（设置不受影响）。确定继续？')) {
      e.target.value = ''; return
    }
    setBusy(true)
    try {
      const buf = await file.arrayBuffer()
      const { importXlsx } = await import('../db')
      const count = await importXlsx(buf)
      alert(`成功导入 ${count} 条记录`)
      window.location.reload()
    } catch {
      alert('导入失败')
    } finally {
      setBusy(false)
    }
    e.target.value = ''
  }

  // --- Settings JSON export / import ---
  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'baby-recorder-settings.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        setSettings({ ...defaults, ...JSON.parse(reader.result as string) })
      } catch {
        alert('导入失败')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Today stats
  const [stats, setStats] = useState<{ feedings: number; diapers: number } | null>(null)
  useEffect(() => {
    const s = new Date(); s.setHours(0, 0, 0, 0)
    const e = new Date(s.getTime() + 86_399_999)
    store.getDailyRecords(s, e).then((r) =>
      setStats({ feedings: r.feedings.length, diapers: r.diapers.length }),
    )
  }, [store])

  const handleClearAll = async () => {
    if (!confirm('清空所有记录和设置，不可恢复。确定继续？')) return
    const { resetDB } = await import('../db')
    await resetDB()
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-fluid-c">
        <p className="text-fluid-base text-ink-600">加载设置中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-fluid-c">
        <p className="text-fluid-base text-warn">无法连接到服务端，请检查网络连接后刷新页面。</p>
        <p className="text-fluid-xs text-ink-600 mt-2">设置将使用默认值，连接恢复后会自动同步。</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-fluid-c">
      <h1 className="text-fluid-xl font-bold mb-4">设置</h1>

      {/* Baby Profile */}
      <section className="mb-8">
        <h2 className="text-fluid-lg font-semibold mb-3 flex items-center gap-1">
          <Baby className="h-5 w-5 text-coral" />
          宝宝档案
        </h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-fluid-xs text-ink-600">宝宝昵称</label>
            <input
              type="text"
              value={settings.babyName}
              onChange={(e) => update({ babyName: e.target.value })}
              placeholder="给宝贝起个名字"
              className="mt-1 w-full rounded-xl border border-gray-300 p-2 text-fluid-base"
            />
          </div>
          <div>
            <label className="text-fluid-xs text-ink-600">出生日期</label>
            <input
              type="date"
              value={settings.babyBirthday}
              onChange={(e) => update({ babyBirthday: e.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-300 p-2 text-fluid-base"
            />
          </div>
        </div>
        {(settings.babyName || settings.babyBirthday) && (
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-fluid-lg">{settings.babyName || '宝宝'} 🍼</p>
            {settings.babyBirthday && (
              <p className="text-fluid-xs text-ink-600 mt-1">
                生日：{new Date(settings.babyBirthday).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Reminders */}
      <section className="mb-8">
        <h2 className="text-fluid-lg font-semibold mb-3 flex items-center gap-1">
          <Bell className="h-5 w-5 text-coral" />
          喂奶提醒
        </h2>
        <div className="flex flex-col gap-4">
          <label className="flex items-center justify-between">
            <span className="text-fluid-base">开启提醒</span>
            <input
              type="checkbox"
              checked={settings.reminderEnabled}
              onChange={(e) => update({ reminderEnabled: e.target.checked })}
              className="h-5 w-5 rounded accent-coral"
            />
          </label>
          {settings.reminderEnabled && (
            <>
              <p className="text-fluid-xs text-ink-600">
                提醒间隔：每
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={settings.reminderInterval}
                  onChange={(e) =>
                    update({ reminderInterval: Math.max(1, Math.min(8, +e.target.value)) })
                  }
                  className="mx-1 w-12 rounded border border-gray-300 p-1 text-center text-fluid-base"
                />
                小时
              </p>
              <p className="text-fluid-xs text-ink-600">
                免打扰：{settings.quietStart} ~ {settings.quietEnd}
              </p>
              {isQuietHours(settings) && (
                <p className="text-fluid-xs text-warn">当前在免打扰时段</p>
              )}
              <p className="text-fluid-xs text-ink-600">
                ⚠️ 推送通知需在浏览器设置中允许本站通知权限。
              </p>
            </>
          )}
        </div>
      </section>

      {/* Data */}
      <section className="mb-8">
        <h2 className="text-fluid-lg font-semibold mb-3 flex items-center gap-1">
          <Database className="h-5 w-5 text-coral" />
          数据管理
        </h2>
        <p className="text-fluid-base text-ink-600 mb-4">
          所有数据存储在服务端 SQLite 数据库中，仅存于你自己的部署环境。
        </p>

        {/* SQLite backup */}
        <div className="flex flex-col gap-2 mb-3">
          <p className="text-fluid-sm font-medium">完整数据库备份（SQLite）</p>
          <p className="text-fluid-xs text-ink-600">
            导出完整数据库快照，适合在设备间迁移数据。
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportData}
              disabled={busy}
              className="flex items-center gap-1 rounded-full bg-coral px-4 py-2 text-white text-fluid-base disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              备份
            </button>
            <label className="flex items-center gap-1 rounded-full bg-white border border-gray-300 px-4 py-2 text-fluid-base cursor-pointer disabled:opacity-60">
              <Upload className="h-4 w-4" />
              恢复
              <input type="file" accept=".sqlite,.db,.bin" onChange={importData} disabled={busy} className="hidden" />
            </label>
          </div>
        </div>

        <hr className="border-gray-200 my-4" />

        {/* Excel */}
        <div className="flex flex-col gap-2 mb-3">
          <p className="text-fluid-sm font-medium">Excel 导出 / 导入</p>
          <p className="text-fluid-xs text-ink-600">
            导出为两页 Excel（喂养记录 + 尿便记录），适合用 Excel / WPS 查看或编辑后重新导入。
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportXlsx}
              disabled={busy}
              className="flex items-center gap-1 rounded-full bg-emerald-500 px-4 py-2 text-white text-fluid-base disabled:opacity-60"
            >
              <FileSpreadsheet className="h-4 w-4" />
              导出 Excel
            </button>
            <label className="flex items-center gap-1 rounded-full bg-white border border-gray-300 px-4 py-2 text-fluid-base cursor-pointer disabled:opacity-60">
              <Table className="h-4 w-4" />
              导入 Excel
              <input type="file" accept=".xlsx,.xls" onChange={importXlsxHandler} disabled={busy} className="hidden" />
            </label>
          </div>
        </div>

        <hr className="border-gray-200 my-4" />

        {/* Settings JSON */}
        <div className="flex flex-col gap-2 mb-4">
          <p className="text-fluid-sm font-medium text-ink-600">设置备份 / 恢复（JSON）</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportSettings}
              disabled={busy}
              className="flex items-center gap-1 rounded-full bg-coral px-4 py-2 text-white text-fluid-base disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              导出设置
            </button>
            <label className="flex items-center gap-1 rounded-full bg-white border border-gray-300 px-4 py-2 text-fluid-base cursor-pointer disabled:opacity-60">
              <Upload className="h-4 w-4" />
              导入设置
              <input type="file" accept=".json" onChange={importSettings} disabled={busy} className="hidden" />
            </label>
          </div>
        </div>

        <hr className="border-gray-200 my-4" />

        {/* Danger */}
        <div>
          <p className="text-fluid-sm font-semibold text-red-500 mb-1">危险操作</p>
          <p className="text-fluid-xs text-ink-600 mb-2">
            清除所有记录和设置，不可恢复。建议先导出数据。
          </p>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={busy}
            className="flex items-center gap-1 rounded-full border border-red-300 text-red-500 bg-white px-4 py-2 text-fluid-base disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            清空所有数据
          </button>
        </div>
      </section>

      {/* Today summary */}
      {stats && (
        <section>
          <p className="text-fluid-base text-ink-600 mb-2">今日概况</p>
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))' }}
          >
            <StatCard title="今天吃奶" value={stats.feedings} unit="次" />
            <StatCard title="今天尿便" value={stats.diapers} unit="次" />
          </div>
        </section>
      )}

      <footer className="mt-10 text-center text-fluid-xs text-ink-600">
        宝宝记录 v0.1 · 数据存储于服务端 SQLite
      </footer>
    </div>
  )
}
