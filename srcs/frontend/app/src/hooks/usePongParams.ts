import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

type Mode = "offline" | "online";
export type Difficulty = "easy" | "medium" | "hard" | "hard_advanced";

export default function usePongParams() {
	const [searchParams, setSearchParams] = useSearchParams();

	const mode = searchParams.get("mode") as Mode | undefined;
	const gamemode = searchParams.get("gamemode");
	const diff = searchParams.get("difficulty") as Difficulty | undefined;
	const id = searchParams.get("id");

	const setParams = useCallback(
		(
			next: {
				mode?: Mode | undefined;
				gamemode?: string | undefined;
				diff?: Difficulty | undefined;
				id?: string | undefined;
			} | null
		) => {
			setSearchParams(() => {
				const p = new URLSearchParams();
				if (!next) return p;
				if (next.mode) p.set("mode", next.mode);
				if (next.gamemode) p.set("gamemode", next.gamemode);
				if (next.diff) p.set("difficulty", next.diff);
				if (next.id) p.set("id", next.id);
				return p;
			});
		},
		[setSearchParams]
	);

	return {
		mode,
		gamemode,
		diff,
		id,
		setParams,
	};
}
