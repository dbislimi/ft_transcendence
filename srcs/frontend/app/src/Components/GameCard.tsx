import React from "react";

interface CardProps {
	title: string;
	subtitle?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm?: () => void;
	onCancel?: () => void;
	disabledConfirm?: boolean;
	actionsDirection?: "horizontal" | "vertical";
	children?: React.ReactNode;
}

export default function GameCard({
	title,
	subtitle,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	onConfirm,
	onCancel,
	disabledConfirm = false,
	actionsDirection = "horizontal",
	children,
}: CardProps) {
	const blockClass =
		actionsDirection === "vertical"
			? "flex flex-col gap-3 pt-2"
			: "flex gap-3 pt-2";
	const buttonClass =
		actionsDirection === "vertical" ? "w-full" : "flex-1";

	let buttons: React.ReactNode = null;
	if (onCancel || onConfirm) {
		const confirmBtn = onConfirm ? (
			<button
				key="confirm"
				onClick={onConfirm}
				disabled={disabledConfirm}
				className={`${buttonClass} py-4 px-6 rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold hover:from-cyan-500 hover:to-purple-500 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl`}
			>
				{confirmLabel}
			</button>
		) : null;
		const cancelBtn = onCancel ? (
			<button
				key="cancel"
				onClick={onCancel}
				className={`${buttonClass} py-4 px-6 rounded-lg border border-slate-600 text-slate-300 font-medium hover:border-slate-500 hover:text-slate-100 transition-all`}
			>
				{cancelLabel}
			</button>
		) : null;
		const ordered =
			actionsDirection === "vertical"
				? [confirmBtn, cancelBtn]
				: [cancelBtn, confirmBtn];
		buttons = (
			<div className={blockClass}>{ordered.filter(Boolean)}</div>
		);
	}
	return (
		<div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/30 p-8 w-full max-w-md shadow-2xl">
			<h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-fuchsia-500 to-purple-600 mb-4 text-left">
				{title}
			</h1>
			{subtitle && (
				<p className="text-slate-300 text-lg text-left mb-6">
					{subtitle}
				</p>
			)}
			<div className="space-y-6">
				{children}
				{buttons}
			</div>
		</div>
	);
}
