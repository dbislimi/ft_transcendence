import { useEffect, useState } from "react";

export interface CountdownProps {
	seconds?: number;
	onComplete?: () => void;
	value?: number | null;
}

export default function Countdown({
	seconds = 0,
	onComplete,
	value: controlledValue,
}: CountdownProps) {
	const isControlled = typeof controlledValue === "number";
	const [value, setValue] = useState(
		isControlled ? controlledValue : seconds
	);

	useEffect(() => {
		if (!isControlled) return;
		if (controlledValue !== null && controlledValue !== undefined) {
			setValue(controlledValue);
		}
	}, [controlledValue, isControlled]);

	useEffect(() => {
		if (isControlled) {
			return;
		}
		if (value <= 0) return;
		const id = setInterval(() => {
			setValue((prev) => {
				const next = prev > 0 ? prev - 1 : 0;
				return next;
			});
		}, 1000);
		return () => clearInterval(id);
	}, [isControlled, value]);

	useEffect(() => {
		if (value === 0) {
			onComplete?.();
		}
	}, [value, onComplete]);

	if (value <= 0) return null;
	return (
		<div
			className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 pointer-events-none"
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
