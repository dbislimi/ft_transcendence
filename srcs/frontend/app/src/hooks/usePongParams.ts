import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

type Mode = "offline" | "online";

export default function usePongParams() {
	const [searchParams, setSearchParams] = useSearchParams();

	const mode = searchParams.get("mode") as Mode | undefined;
	const id = searchParams.get("id");

	const setParams = useCallback(
		(
			next: {
				mode?: Mode | undefined;
				id?: string | undefined;
			} | null
		) => {
			setSearchParams(() => {
				const p = new URLSearchParams();
				if (!next) return p;
				if (next.mode) p.set("mode", next.mode);
				if (next.id) p.set("id", next.id);
				return p;
			});
		},
		[setSearchParams]
	);

	return {
		mode,
		id,
		setParams,
	};
}
