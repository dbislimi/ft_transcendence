export default class MyNumpy {
    static zeros(rows, columns) {
        if (columns === undefined)
            return Array(rows).fill(0);
        else if (columns === 0)
            throw new Error("Method zeros() does not accept 0 columns as param");
        return Array(rows)
            .fill(0)
            .map(() => Array(columns).fill(0));
    }
    static shape(arr) {
        return [arr.length, Array.isArray(arr[0]) ? arr[0].length : undefined];
    }
    static findMax(matrice) {
        let index = 0;
        let maxValue = -Infinity;
        if (!Array.isArray(matrice[0])) {
            const arr = matrice;
            for (let i = 0; i < arr.length; ++i) {
                if (arr[i] > maxValue) {
                    maxValue = arr[i];
                    index = i;
                }
            }
        }
        else {
            for (let i = 0; i < matrice.length; ++i) {
                const col = matrice[i];
                for (let j = 0; j < matrice[0].length; ++j) {
                    if (col[j] > maxValue) {
                        maxValue = col[j];
                        index = matrice[0].length * i + j;
                    }
                }
            }
        }
        return { index, maxValue };
    }
    static argmax(matrice) {
        return this.findMax(matrice).index;
    }
    static max(matrice) {
        return this.findMax(matrice).maxValue;
    }
}
const arr = MyNumpy.zeros(4, 6);
arr[2][5] = 1;
arr[1][3] = 10;
console.log(arr);
console.log(MyNumpy.shape(arr));
console.log(MyNumpy.argmax(arr));
console.log(MyNumpy.max(arr));
