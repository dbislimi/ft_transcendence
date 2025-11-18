import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export default function usePongParams() {
	const [searchParams, setSearchParams] = useSearchParams();

	const mode = searchParams.get("mode");

	const setParams = useCallback(
		(
			next: {
				mode?: string | undefined;
				id?: string | undefined;
			} | null
		) => {
			setSearchParams(() => {
				const p = new URLSearchParams();
				if (!next) return p;
				if (next.mode) p.set("mode", next.mode);
				return p;
			});
		},
		[setSearchParams]
	);
	return {
		mode,
		setParams,
	};
}
