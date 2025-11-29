import { useEffect, useRef, useState } from "react";
import { useNotifications } from "../contexts/NotificationContext";
import type {
	NotificationItem,
	NotificationVariant,
	NotificationAction,
} from "../contexts/NotificationContext";

export default function NotificationsContainer() {
	const { notifications, dismiss } = useNotifications();

	const containerPosition =
		"fixed z-70 p-4 gap-3 flex flex-col bottom-4 right-4";

	return (
		<div
			className={containerPosition}
			aria-live="polite"
			aria-atomic="false"
		>
			{notifications.map((n: NotificationItem) => (
				<Toast key={n.id} item={n} onClose={() => dismiss(n.id)} />
			))}
		</div>
	);
}

function Toast({
	item,
	onClose,
}: {
	item: NotificationItem;
	onClose: () => void;
}) {
	const [remaining, setRemaining] = useState(item.duration ?? 0);
	const startRef = useRef<number | null>(null);
	const rafRef = useRef<number | null>(null);

	useEffect(() => {
		if (!item.duration) return;

		const tick = (now: number) => {
			if (startRef.current == null) startRef.current = now;
			const elapsed = now - startRef.current;
			const base = typeof item.duration === "number" ? item.duration : 0;
			const left = Math.max(0, (remaining || base) - elapsed);
			setRemaining(left);
			if (left <= 0) {
				onClose();
				return;
			}
			rafRef.current = requestAnimationFrame(tick);
		};

		startRef.current = performance.now();
		rafRef.current = requestAnimationFrame(tick);

		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		};
	}, [item.duration]);

	const variantClasses = getVariantClasses(item.variant);

	const progress = item.duration
		? Math.max(0, Math.min(1, remaining / item.duration))
		: 0;

	return (
		<div
			className={`w-80 max-w-[90vw] rounded-lg border shadow-lg overflow-hidden ${variantClasses.container}`}
			role="status"
		>
			<div className={`px-4 py-3 ${variantClasses.header}`}>
				<div className="flex items-start gap-3">
					<div
						className={`mt-0.5 h-2 w-2 rounded-full ${variantClasses.dot}`}
					/>
					<div className="flex-1 min-w-0">
						{item.title && (
							<div className="font-semibold leading-5 truncate">
								{item.title}
							</div>
						)}
						<div className="text-sm opacity-90 leading-5 break-words">
							{item.message}
						</div>
					</div>
					<button
						className="ml-2 shrink-0 rounded-md p-1 hover:bg-white/10 text-white/80 hover:text-white"
						aria-label="Fermer la notification"
						onClick={() => {
							const action = item.actions?.find(
								(a: NotificationAction) => a.type === "decline"
							);
							if (action?.onPress) {
								action.onPress();
							}
							onClose();
						}}
					>
						✕
					</button>
				</div>
			</div>
			{item.actions && item.actions.length > 0 && (
				<div className="px-4 pb-3 pt-1 flex gap-2 justify-end bg-black/20">
					{item.actions.map((a: NotificationAction, idx: number) => (
						<button
							key={idx}
							type="button"
							onClick={() => {
								try {
									a.onPress?.();
								} finally {
									onClose();
								}
							}}
							className={
								a.primary
									? "px-3 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-medium"
									: "px-3 py-1.5 rounded-md border border-white/25 hover:border-white/50 text-white text-sm"
							}
						>
							{a.label}
						</button>
					))}
				</div>
			)}
			{item.duration && (
				<div className="h-1 w-full bg-black/30">
					<div
						className="h-full bg-cyan-400 transition-[width]"
						style={{ width: `${progress * 100}%` }}
					/>
				</div>
			)}
		</div>
	);
}

function getVariantClasses(variant?: NotificationVariant) {
	switch (variant) {
		case "success":
			return {
				container: "bg-emerald-800/90 border-emerald-400/40 text-white",
				header: "bg-emerald-900/40",
				dot: "bg-emerald-300",
			};
		case "warning":
			return {
				container: "bg-amber-800/90 border-amber-400/40 text-white",
				header: "bg-amber-900/40",
				dot: "bg-amber-300",
			};
		case "error":
			return {
				container: "bg-rose-800/90 border-rose-400/40 text-white",
				header: "bg-rose-900/40",
				dot: "bg-rose-300",
			};
		case "info":
			return {
				container: "bg-sky-800/90 border-sky-400/40 text-white",
				header: "bg-sky-900/40",
				dot: "bg-sky-300",
			};
		case "default":
		default:
			return {
				container: "bg-slate-900/95 border-slate-400/30 text-white",
				header: "bg-slate-900/60",
				dot: "bg-slate-200",
			};
	}
}
