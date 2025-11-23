import React from "react";

interface ColorOption {
	label: string;
	color: string;
}

interface ChoiceGroupProps<T extends string | number> {
	label?: string;
	options: T[] | ColorOption[];
	value: T | T[] | null;
	onChange: (val: T | T[]) => void;
	multiple?: boolean;
	columns?: number;
	variant?: "sm" | "md" | "lg";
	className?: string;
	color?:
		| "cyan"
		| "purple"
		| "pink"
		| "emerald"
		| "orange"
		| "rose"
		| "blue"
		| "amber";
}

const DEFAULT_INACTIVE =
	"border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300";

export default function ChoiceGroup<T extends string | number>(
	props: ChoiceGroupProps<T>
) {
	const {
		label,
		options,
		value,
		onChange,
		multiple = false,
		columns,
		variant = "md",
		className = "",
		color = "cyan",
	} = props;

	const variantClasses: Record<string, string> = {
		sm: "py-1.5 px-3 text-xs",
		md: "py-2.5 px-4 text-sm",
		lg: "py-3 px-5 text-base",
	};

	const GRID_COLS: Record<number, string> = {
		1: "grid-cols-1",
		2: "grid-cols-2",
		3: "grid-cols-3",
		4: "grid-cols-4",
		5: "grid-cols-5",
		6: "grid-cols-6",
		7: "grid-cols-7",
		8: "grid-cols-8",
		9: "grid-cols-9",
		10: "grid-cols-10",
		11: "grid-cols-11",
		12: "grid-cols-12",
	};

	let gridColsClass: string;
	if (columns && GRID_COLS[columns]) {
		gridColsClass = GRID_COLS[columns];
	} else {
		const auto = Math.min(4, options.length || 1);
		gridColsClass = GRID_COLS[auto];
	}

	const COLOR_ACTIVE: Record<string, string> = {
		cyan: "border-cyan-400 bg-cyan-400/20 text-cyan-300",
		purple: "border-purple-400 bg-purple-400/20 text-purple-300",
		pink: "border-pink-400 bg-pink-400/20 text-pink-300",
		emerald: "border-emerald-400 bg-emerald-400/20 text-emerald-300",
		orange: "border-orange-400 bg-orange-400/20 text-orange-300",
		rose: "border-rose-400 bg-rose-400/20 text-rose-300",
		blue: "border-blue-400 bg-blue-400/20 text-blue-300",
		amber: "border-amber-400 bg-amber-400/20 text-amber-300",
	};

	return (
		<div className={`space-y-2 ${className}`}>
			{label && (
				<label className="block text-slate-300 text-sm font-medium">
					{label}
				</label>
			)}
			<div className={`grid ${gridColsClass} gap-2`}>
				{options.map((opt) => {
					const isColorOption =
						typeof opt === "object" &&
						opt !== null &&
						"label" in opt &&
						"color" in opt;
					const displayValue = isColorOption
						? (opt as ColorOption).label
						: String(opt);
					const compareValue = isColorOption
						? (opt as ColorOption).color
						: opt;
					const customColor = isColorOption
						? (opt as ColorOption).color
						: undefined;

					const active = multiple
						? ((value as T[] | null) || []).includes(
								compareValue as T
						  )
						: value === compareValue;

					const mode = active
						? COLOR_ACTIVE[color]
						: DEFAULT_INACTIVE;

					const buttonStyle =
						customColor && active
							? {
									borderColor: customColor,
									backgroundColor: customColor + "33",
									color: customColor,
							  }
							: {};

					return (
						<button
							key={displayValue}
							type="button"
							onClick={() => {
								if (multiple) {
									const currentValues =
										(value as T[] | null) || [];
									const newValues = active
										? currentValues.filter(
												(v) => v !== compareValue
										  )
										: [...currentValues, compareValue as T];
									onChange(newValues as any);
								} else if (!active) {
									onChange(compareValue as any);
								}
							}}
							className={`rounded-lg border transition-all duration-200 font-medium ${variantClasses[variant]} ${mode}`}
							style={buttonStyle}
						>
							{displayValue}
						</button>
					);
				})}
			</div>
		</div>
	);
}
