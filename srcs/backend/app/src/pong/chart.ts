import fetch from "node-fetch";
import { writeFileSync } from "fs";

function shrinkTab(tab: number[]) {
	if (tab.length < 300) return tab;
	return tab.filter((_, i) => i % 10 === 0);
}

export default async function plotRewards(name: string, tab: number[], diff: string, episode?: number) {
	const chartConfig = {
		type: "line",
		data: {
			labels: tab.map((_, i) => `Episode ${i + 1}`),
			datasets: [
				{
					label: name,
					data: shrinkTab(tab),
					borderColor: "blue",
					fill: false,
				},
			],
		},
		options: {
			plugins: {
				title: {
					display: true,
					text: `${name} per episode`,
				},
			},
			scales: {
				x: { title: { display: true, text: "Episodes" } },
				y: { title: { display: true, text: name } },
			},
		},
	};

	const url = "https://quickchart.io/chart";
	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ chart: chartConfig, width: 800, height: 400 }),
	});

	const buffer = Buffer.from(await res.arrayBuffer());
	const suffix = episode && episode !== 0 ? `_${episode}` : "";
	writeFileSync(`../AI/qtable_saves/${diff}/graph/${name}${suffix}.png`, buffer);
	console.log(`✅ Graphique généré : ${name}.png`);
}
