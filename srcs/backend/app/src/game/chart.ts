import fetch from "node-fetch";
import { writeFileSync } from "fs";

export default async function plotRewards(rewards: number[]) {

  const chartConfig = {
    type: "line",
    data: {
      labels: rewards.map((_, i) => `Episode ${i + 1}`),
      datasets: [
        {
          label: "Reward",
          data: rewards,
          borderColor: "blue",
          fill: false,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Récompenses par épisode",
        },
      },
      scales: {
        x: { title: { display: true, text: "Episodes" } },
        y: { title: { display: true, text: "Reward" } },
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
  writeFileSync("../AI/rewards.png", buffer);
  console.log("✅ Graphique généré : rewards.png");
}

