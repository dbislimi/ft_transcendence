import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

type Mode = "offline" | "online";
export type Difficulty = "easy" | "medium" | "hard";

export default function usePongParams() {
	const [searchParams, setSearchParams] = useSearchParams();

	const mode = searchParams.get("mode") as Mode | undefined;
	const gamemode = searchParams.get("gamemode");
	const diff = searchParams.get("difficulty") as Difficulty | undefined;
	const queue = searchParams.get("queue");

	const setParams = useCallback(
		(
			next: {
				mode?: Mode | undefined;
				gamemode?: string | undefined;
				diff?: Difficulty | undefined;
				queue?: string | undefined;
			} | null
		) => {
			setSearchParams(() => {
				const p = new URLSearchParams();
				if (!next) return p;
				if (next.mode) p.set("mode", next.mode);
				if (next.gamemode) p.set("gamemode", next.gamemode);
				if (next.diff) p.set("difficulty", next.diff);
				if (next.queue) p.set("queue", next.queue);
				return p;
			});
		},
		[setSearchParams]
	);

	return {
		mode,
		gamemode,
		diff,
		queue,
		setParams,
	};
}
