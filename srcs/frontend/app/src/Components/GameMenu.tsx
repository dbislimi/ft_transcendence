import { useState } from "react";

interface Props {
	start: (online: boolean, diff?: difficulty) => void;
}

export type difficulty = undefined | "easy" | "medium" | "hard";

export default function GameMenu({ start }: Props) {
	const [online, setOnline] = useState(false);
	const [difficulty, setDifficulty] = useState<difficulty>("medium");
	const difficulties = [
		{ value: undefined, label: "Local" },
		{ value: "easy", label: "Easy" },
		{ value: "medium", label: "Medium" },
		{ value: "hard", label: "Hard" },
	];
	
	return (
		<div className="absolute flex flex-col space-y-2 items-center space-x-3 p-10 border border-white size-100 bg-black opacity-80">
			<div className="flex items-center space-x-2">
				<span className="text-white">Online</span>
				<label className="relative inline-flex items-center">
					<input
						type="checkbox"
						className="sr-only peer"
						onChange={() => setOnline(!online)}
					/>
					<div className="w-11 h-6 bg-gray-600 rounded-2xl transition-colors duration-300 peer-checked:bg-green-400" />
					<div className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition-transform bg-white peer-checked:translate-x-full" />
				</label>
			</div>
			<fieldset className="flex border border-white space-x-10 p-2">
				<legend className="text-white">Select bot difficulty</legend>
				{difficulties.map(({ value, label }) => (
					<label key={label} className={`text-white ${online && 'opacity-60'}`}>
						<input
							type="radio"
							name="difficulty"
							value={value}
							checked={!online && difficulty === value}
							disabled={online}
							onChange={() => setDifficulty(value as difficulty)}
						/>
						{label}
					</label>
				))}
			</fieldset>
			<button
				type="button"
				onClick={() => start(online, online ? undefined : difficulty)}
				className="text-white border border-white p-2"
				>
				Play
			</button>
			
			<button
				type="button"
				onClick={!online ? () => start(true, difficulty) : undefined}
				className="text-white border border-white p-2 bg-red-500"
				>
				Train
			</button>
		</div>
	);
}
