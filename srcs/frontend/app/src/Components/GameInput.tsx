
interface Labels {
	name: string;
	private: string;
	password: string;
}

interface GameInputProps {
	name: string;
	onNameChange: (value: string) => void;
	isPrivate: boolean;
	onIsPrivateChange: (value: boolean) => void;
	password: string;
	onPasswordChange: (value: string) => void;
	labels: Labels;
}

export default function GameInput({
	name,
	onNameChange,
	isPrivate,
	onIsPrivateChange,
	password,
	onPasswordChange,
	labels,
}: GameInputProps) {
	return (
		<div className="space-y-4">
			<div>
				<label className="block text-slate-300 text-sm mb-1">
					{labels.name}
				</label>
				<input
					value={name}
					onChange={(e) => onNameChange(e.target.value)}
					className="w-full px-3 py-2 rounded bg-slate-700/60 border border-slate-600 text-white"
				/>
			</div>
			<div className="flex items-center gap-2">
				<input
					id="isPrivate"
					type="checkbox"
					checked={isPrivate}
					onChange={(e) => onIsPrivateChange(e.target.checked)}
				/>
				<label htmlFor="isPrivate" className="text-slate-300">
					{labels.private}
				</label>
			</div>
			{isPrivate && (
				<div>
					<label className="block text-slate-300 text-sm mb-1">
						{labels.password}
					</label>
					<input
						type="password"
						value={password}
						onChange={(e) => onPasswordChange(e.target.value)}
						className="w-full px-3 py-2 rounded bg-slate-700/60 border border-slate-600 text-white"
					/>
				</div>
			)}
		</div>
	);
}
