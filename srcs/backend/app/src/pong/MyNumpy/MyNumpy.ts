type matrice = number[] | number[][];

export default class MyNumpy {
	static findMax(matrice: matrice) {
		let index: number = 0;
		let maxValue: number = -Infinity;
		if (!Array.isArray(matrice[0])) {
			const arr = matrice as number[];
			for (let i = 0; i < arr.length; ++i) {
				const value = arr[i];
				if (value && value > maxValue) {
					maxValue = value;
					index = i;
				}
			}
		} else {
			for (let i = 0; i < matrice.length; ++i) {
				const col = matrice[i] as number[];
				for (let j = 0; j < matrice[0].length; ++j) {
					const value = col[j];
					if (value && value > maxValue) {
						maxValue = value;
						index = matrice[0].length * i + j;
					}
				}
			}
		}
		return { index, maxValue };
	}
	static argmax(matrice: matrice) {
		return this.findMax(matrice).index;
	}
	static max(matrice: matrice) {
		return this.findMax(matrice).maxValue;
	}
}