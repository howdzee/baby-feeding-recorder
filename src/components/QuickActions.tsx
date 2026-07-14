import { useNavigate } from 'react-router-dom'
import { Pill, Syringe } from 'lucide-react'

type NavType = 'feeding' | 'diaper'

export default function QuickActions({
	onNavigate,
}: {
	onNavigate: (type: NavType) => void
}) {
	const navigate = useNavigate()

	return (
		<div className="flex gap-4">
			{(
				[
					{ key: 'feeding' as NavType, label: '吃奶', Icon: Pill, cls: 'bg-coral text-white' },
					{ key: 'diaper' as NavType, label: '排便', Icon: Syringe, cls: 'bg-mint text-white' },
				] as const
			).map(({ key, label, Icon, cls }) => (
				<button
					key={key}
					type="button"
					onClick={() => {
						onNavigate(key)
						navigate(`/add?type=${key}`)
					}}
					className={`${cls} flex flex-col items-center justify-center rounded-2xl shadow-lg active:scale-95`}
					style={{
						width: 'clamp(120px, 35vw, 160px)',
						height: 'clamp(120px, 35vw, 160px)',
						containerType: 'inline-size',
					}}
				>
					<Icon className="h-10 w-10" strokeWidth={1.5} />
					<span className="mt-2 text-base font-semibold">{label}</span>
				</button>
			))}
		</div>
	)
}
