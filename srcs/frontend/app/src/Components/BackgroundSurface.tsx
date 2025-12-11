import { useGlobalBackground } from "../contexts/GlobalBackgroundContext";
import SpaceBackground from "./SpaceBackground";

export default function BackgroundSurface() {
	const { currentBackground } = useGlobalBackground();

	if (currentBackground.id === "default")
		return <SpaceBackground />;
	return (
		<div
			className="fixed inset-0 -z-10 bg-cover bg-center bg-fixed"
			style={{
				backgroundImage: currentBackground.url
					? `url(${currentBackground.url})`
					: "none",
			}}
		/>
	);
}
