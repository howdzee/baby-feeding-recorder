import { useMemo } from 'react'
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	Legend,
} from 'recharts'
import type { Feeding, Diaper } from '../../types'

const FEEDING_COLORS: Record<string, string> = {
	奶粉: '#FF8FA3',
	母乳瓶喂: '#F4728F',
	左乳: '#7DD3C0',
	右乳: '#FFB74D',
	双侧: '#8884d8',
}

const DIAPER_COLORS: Record<string, string> = {
	尿尿: '#7DD3C0',
	便便: '#FFB74D',
	两者: '#8884d8',
}

function fmtTime(d: Date): string {
	return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function feedingKey(f: Feeding): string {
	if (f.type === 'formula') return '奶粉'
	if (f.type === 'breast_bottle') return '母乳瓶喂'
	if (f.type === 'breast_left') return '左乳'
	if (f.type === 'breast_right') return '右乳'
	return '双侧'
}


export default function DayCharts({ feedings, diapers }: { feedings: Feeding[]; diapers: Diaper[] }) {
	const hourlyData = useMemo(() => {
		const map: Record<number, { hour: string; ml: number; min: number }> = {}
		for (const f of feedings) {
			const h = new Date(f.startedAt).getHours()
			if (!map[h]) map[h] = { hour: `${String(h).padStart(2, '0')}:00`, ml: 0, min: 0 }
			if (f.type === 'formula' || f.type === 'breast_bottle') {
				map[h].ml += f.amount ?? 0
			} else {
				map[h].min += Math.round((f.durationSec ?? 0) / 60)
			}
		}
		return Object.values(map).sort((a, b) => a.hour.localeCompare(b.hour))
	}, [feedings])

	const feedingPie = useMemo(() => {
		const map: Record<string, number> = {}
		for (const f of feedings) {
			const key = feedingKey(f)
			map[key] = (map[key] || 0) + 1
		}
		return Object.entries(map).map(([name, value]) => ({ name, value, color: FEEDING_COLORS[name] ?? '#888' }))
	}, [feedings])

	const diaperPie = useMemo(() => {
		const map: Record<string, { count: number; rash: number }> = {}
		for (const d of diapers) {
			const label = d.type === 'pee' ? '尿尿' : d.type === 'poop' ? '便便' : '两者'
			if (!map[label]) map[label] = { count: 0, rash: 0 }
			map[label].count++
			if (d.hadRash) map[label].rash++
		}
		return Object.entries(map).map(([name, v]) => ({
			name,
			count: v.count,
			rash: v.rash,
			color: DIAPER_COLORS[name] ?? '#888',
		}))
	}, [diapers])

	const totalRash = diapers.filter((d) => d.hadRash).length

	return (
		<section className="mt-4 flex flex-col gap-5 rounded-2xl bg-white p-fluid-c shadow-sm">
			<h2 className="text-fluid-lg font-semibold text-ink-900">当日统计详情</h2>

			{hourlyData.length > 0 && (
				<div>
					<p className="text-fluid-xs text-ink-600 mb-2">分时辰喂奶分布</p>
					<ResponsiveContainer width="100%" height={180}>
						<BarChart data={hourlyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
							<XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#888' }} />
							<YAxis tick={{ fontSize: 11, fill: '#888' }} />
							<Tooltip contentStyle={{ borderRadius: 12, fontSize: 13 }} />
							<Bar dataKey="ml" fill="#FF8FA3" radius={[3, 3, 0, 0]} name="奶量(ml)" />
							<Bar dataKey="min" fill="#7DD3C0" radius={[3, 3, 0, 0]} name="时长(分钟)" />
						</BarChart>
					</ResponsiveContainer>
					<div className="flex gap-4 mt-1">
						<span className="flex items-center gap-1 text-fluid-xs text-ink-600">
							<span className="inline-block h-2 w-2.5 rounded-full bg-coral" /> 母乳(ml)
						</span>
						<span className="flex items-center gap-1 text-fluid-xs text-ink-600">
							<span className="inline-block h-2 w-2.5 rounded-full bg-mint" /> 亲喂(分钟)
						</span>
					</div>
				</div>
			)}

			{(feedingPie.length > 0 || diaperPie.length > 0) && (
				<div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
					{feedingPie.length > 0 && (
						<div>
							<p className="text-fluid-xs text-ink-600 mb-1">喂养类型</p>
							<ResponsiveContainer width="100%" height={160}>
								<PieChart>
									<Pie
										data={feedingPie}
										dataKey="value"
										nameKey="name"
										cx="50%"
										cy="50%"
										innerRadius={35}
										outerRadius={60}
										paddingAngle={3}
										stroke="none"
									>
										{feedingPie.map((entry) => (
											<Cell key={entry.name} fill={entry.color} />
										))}
									</Pie>
									<Tooltip contentStyle={{ borderRadius: 12, fontSize: 13 }} />
									<Legend verticalAlign="bottom" height={24} />
								</PieChart>
							</ResponsiveContainer>
						</div>
					)}

					{diaperPie.length > 0 && (
						<div>
							<p className="text-fluid-xs text-ink-600 mb-1">便便情况{totalRash > 0 ? ` · 红臀 ${totalRash} 次` : ''}</p>
							<ResponsiveContainer width="100%" height={160}>
								<PieChart>
									<Pie
										data={diaperPie}
										dataKey="count"
										nameKey="name"
										cx="50%"
										cy="50%"
										innerRadius={35}
										outerRadius={60}
										paddingAngle={3}
										stroke="none"
									>
										{diaperPie.map((entry) => (
											<Cell key={entry.name} fill={entry.color} />
										))}
									</Pie>
									<Tooltip contentStyle={{ borderRadius: 12, fontSize: 13 }} />
									<Legend verticalAlign="bottom" height={24} />
								</PieChart>
							</ResponsiveContainer>
						</div>
					)}
				</div>
			)}

			{(feedings.length > 0 || diapers.length > 0) && (
				<div>
					<p className="text-fluid-xs text-ink-600 mb-2">今日时间线</p>
					<div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
						{[
							...feedings.map((f) => ({
								time: fmtTime(f.startedAt),
								label: f.type === 'formula' || f.type === 'breast_bottle'
									? `${f.amount ?? 0}ml ${feedingKey(f)}`
									: `${Math.floor((f.durationSec ?? 0) / 60)}分钟 ${feedingKey(f)}`,
								kind: 'feeding' as const,
							})),
							...diapers.map((d) => ({
								time: fmtTime(d.recordedAt),
								label: `${d.type === 'pee' ? '尿尿' : d.type === 'poop' ? '便便' : '两者'}${d.hadRash ? ' 红臀' : ''}`,
								kind: 'diaper' as const,
							})),
						]
							.sort((a, b) => a.time.localeCompare(b.time))
							.map((item, i) => (
								<div key={i} className="flex items-center gap-2 text-fluid-xs">
									<span className="shrink-0 w-12 text-ink-600 font-mono">{item.time}</span>
									<span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${item.kind === 'feeding' ? 'bg-coral' : 'bg-mint'}`} />
									<span className={item.kind === 'diaper' && item.label.includes('红臀') ? 'text-warn' : 'text-ink-900'}>
										{item.label}
									</span>
								</div>
							))}
					</div>
				</div>
			)}
		</section>
	)
}
