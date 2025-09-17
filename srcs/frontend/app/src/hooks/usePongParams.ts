import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

type Mode = "offline" | "online";
export type Difficulty = "easy" | "medium" | "hard";

export default function usePongParams() {
	const [searchParams, setSearchParams] = useSearchParams();

	const mode = searchParams.get("mode") as Mode | null;
	const gamemode = searchParams.get("gamemode");
	const diff = searchParams.get("difficulty") as Difficulty | null;

	const setParams = useCallback(
		(next: {
			mode?: Mode | null | undefined;
			gamemode?: string | null | undefined;
			diff?: Difficulty | null | undefined;
		}) => {
			setSearchParams((prev) => {
				if (next.mode !== undefined) {
					if (next.mode === null) prev.delete("mode");
					else prev.set("mode", next.mode);
				}
				if (next.gamemode !== undefined) {
					if (next.gamemode === null) prev.delete("gamemode");
					else prev.set("gamemode", next.gamemode);
				}
				if (next.diff !== undefined) {
					if (next.diff === null) prev.delete("difficulty");
					else prev.set("difficulty", next.diff);
				}
				return prev;
			});
		},
		[]
	);

	return {
		mode,
		gamemode,
		diff,
		setParams,
	};
}
