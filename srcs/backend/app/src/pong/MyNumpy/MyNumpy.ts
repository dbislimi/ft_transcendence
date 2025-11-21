type matrice = number[] | number[][];

export default class MyNumpy {
	static zeros(rows: number, columns?: number): number[] | number[][] {
		if (columns === undefined) return Array(rows).fill(0);
		else if (columns === 0) throw new Error("Method zeros() does not accept 0 columns as param");
		return Array(rows)
			.fill(0)
			.map(() => Array(columns).fill(0));
	}
	static shape(arr: matrice): [r: number, c: number | undefined] {
		if (!Array.isArray(arr)) return [0, undefined];
		const first = arr[0];
		return [arr.length, Array.isArray(first) ? (first as number[]).length : undefined];
	}
	static findMax(m: matrice): { index: number; maxValue: number } {
		let index = 0;
		let maxValue = -Infinity;
		if (!Array.isArray(m) || m.length === 0) return { index, maxValue };

		const first = m[0];
		if (!Array.isArray(first)) {
			const arr = m as number[];
			for (let i = 0; i < arr.length; ++i) {
				if (arr[i] > maxValue) {
					maxValue = arr[i];
					index = i;
				}
			}
		} else {
			const mat = m as number[][];
			const cols = (mat[0] || []).length;
			for (let i = 0; i < mat.length; ++i) {
				const row = mat[i] || [];
				for (let j = 0; j < cols; ++j) {
					const val = row[j];
					if (val > maxValue) {
						maxValue = val;
						index = cols * i + j;
					}
				}
			}
		}
		return { index, maxValue };
	}
	static argmax(m: matrice) {
		return this.findMax(m).index;
	}
	static max(m: matrice) {
		return this.findMax(m).maxValue;
	}

}

