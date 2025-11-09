import ActionButton from "./ActionButton";

type PongModeSelectionProps = {
	onSelect(mode: "offline" | "online"): void;
};

export default function PongModeSelection({
	onSelect,
}: PongModeSelectionProps) {
	return (
		<div className="flex flex-col sm:flex-row items-center justify-center gap-8">
			<ActionButton
				color="gray"
				icon={
					<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
					</svg>
				}
				title="Offline"
				subtitle="Play offline"
				onClick={() => onSelect("offline")}
			/>
			<ActionButton
				color="cyan"
				icon={
					<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
					</svg>
				}
				title="Online"
				subtitle="Play online"
				onClick={() => onSelect("online")}
			/>
		</div>
	);
}

