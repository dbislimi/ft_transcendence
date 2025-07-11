class MyNumpy {
	static zeros(m: number, n?: number) {
		return Array.from({length: m}, () => Array(n).fill(0))
	}

}

console.log(MyNumpy.zeros(2,6))