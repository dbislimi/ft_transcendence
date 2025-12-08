export const lerp = (start: number, end: number, ratio: number) => {
    return start + (end - start) * ratio;
};