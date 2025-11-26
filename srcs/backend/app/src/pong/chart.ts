import fetch from "node-fetch";
import { writeFileSync } from "fs";

function shrinkTab(
	tab: number[],
	maxPoints: number
): { data: number[]; labels: number[] } {
	const n = tab.length;
	if (n <= maxPoints) {
		return { data: [...tab], labels: tab.map((_, i) => i + 1) };
	}
	const data = new Array<number>(maxPoints);
	const labels = new Array<number>(maxPoints);
	for (let k = 0; k < maxPoints; ++k) {
		const idx = Math.round((k * (n - 1)) / (maxPoints - 1));
		data[k] = tab[idx];
		labels[k] = idx + 1;
	}
	return { data, labels };
}

export default async function plotRewards(
	name: string,
	tab: number[],
	diff: string,
	episode?: number
) {
	const { data, labels } = shrinkTab(tab, 250);

	const chartConfig = {
		type: "line",
		data: {
			labels,
			datasets: [
				{
					label: name,
					data,
					borderColor: "blue",
					fill: false,
				},
			],
		},
	};

	const url = "https://quickchart.io/chart";
	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ chart: chartConfig, width: 800, height: 400 }),
	});

	const Buf: any = (globalThis as any).Buffer; // utilisation via globalThis
	const buffer = Buf.from(await res.arrayBuffer());
	const suffix = episode && episode !== 0 ? `_${episode}` : "";
	writeFileSync(
		`../AI/qtable_saves/${diff}/graph/${name}${suffix}.png`,
		buffer
	);
	console.log(
		`✅ Graphique généré : ${name}${
			episode ? "_" + episode : ""
		}.png (épisodes: ${tab.length}, affichés: ${data.length})`
	);
}
