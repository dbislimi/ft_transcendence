import { useEffect, useState } from "react";

export interface CountdownProps {
	seconds: number;
	running: boolean;
	onComplete?: () => void;
}

export default function Countdown({
	seconds,
	running,
	onComplete,
}: CountdownProps) {
	const [value, setValue] = useState(seconds);
	const [active, setActive] = useState(running);

	useEffect(() => {
		if (running) {
			setValue(seconds);
			setActive(true);
		} else {
			setActive(false);
		}
	}, [running, seconds]);

	useEffect(() => {
		if (!active) return;
		if (value <= 0) return;
		const id = setInterval(() => {
			setValue((prev) => {
				if (prev <= 1) {
					clearInterval(id);
					onComplete?.();
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
		return () => clearInterval(id);
	}, [active, value, onComplete]);

	if (!active || value <= 0) return null;
	return (
		<div
			className="absolute inset-0 flex items-center justify-center bg-black/80 z-50"
			aria-label="countdown"
		>
			<div className="text-center select-none">
				<div className="text-2xl text-slate-300 mb-4 tracking-wide">
					Démarrage dans
				</div>
				<div className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 animate-pulse">
					{value}
				</div>
			</div>
		</div>
	);
}
