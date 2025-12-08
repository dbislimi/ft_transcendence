type PingDisplayProps = {
	ping: number | null;
};

export default function PingDisplay({ ping }: PingDisplayProps) {
	if (ping === null) {
		return null;
	}
	const getPingColor = (ms: number) => {
		if (ms < 50) return "text-green-400";
		if (ms < 100) return "text-yellow-400";
		if (ms < 200) return "text-orange-400";
		return "text-red-400";
	};
	return (
		<div className="absolute top-4 right-4 z-80 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
			<div className="flex items-center gap-2">
				<div className="flex items-center gap-1">
					<div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
					<span className="text-white/70 text-sm font-medium">Ping:</span>
				</div>
				<span className={`text-sm font-bold ${getPingColor(ping)}`}>
					{ping} ms
				</span>
			</div>
		</div>
	);
}
