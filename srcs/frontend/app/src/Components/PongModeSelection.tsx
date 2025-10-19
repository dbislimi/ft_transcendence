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
					<span role="img" aria-label="offline">
						🎮
					</span>
				}
				title="Offline"
				subtitle="Play offline"
				onClick={() => onSelect("offline")}
			/>
			<ActionButton
				color="cyan"
				icon={
					<span role="img" aria-label="online">
						🌐
					</span>
				}
				title="Online"
				subtitle="Play online"
				onClick={() => onSelect("online")}
			/>
		</div>
	);
}
