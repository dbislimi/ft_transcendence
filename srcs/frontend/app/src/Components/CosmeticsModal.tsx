import React from "react";
import GameCard from "./GameCard";
import { useWebSocket } from "../context/WebSocketContext";
import { useUser } from "../context/UserContext";

interface Cosmetics {
	preferredSide: string;
	paddleColor: string;
	ballColor: string;
}

interface CosmeticsModalProps {
	onClose: () => void;
	cosmetics: Cosmetics;
}

const CosmeticsModal: React.FC<CosmeticsModalProps> = ({
	onClose,
	cosmetics,
}) => {
	const { pongWsRef } = useWebSocket();
	const { user, setUser } = useUser();
	const [tempCosmetics, setTempCosmetics] = React.useState(cosmetics);

	const handleSave = () => {
		if (pongWsRef.current) {
			pongWsRef.current.send(
				JSON.stringify({
					event: "update_cosmetics",
					to: "user_settings",
					body: tempCosmetics,
				})
			);
		}

		if (user) {
			setUser({
				...user,
				cosmetics: tempCosmetics,
			});
		}

		onClose();
	};

	const handleQuit = () => {
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<GameCard
				title="Paramètres Cosmétiques"
				confirmLabel="Sauvegarder"
				cancelLabel="Quitter"
				onConfirm={handleSave}
				onCancel={handleQuit}
			>
				<div className="space-y-6">
					<div>
						<label className="block mb-3 text-gray-300 font-medium">
							Côté préféré:
						</label>
						<div
							className="relative w-48 aspect-[2/1] mx-auto rounded-lg cursor-pointer overflow-hidden bg-black"
							onClick={(e) => {
								const rect =
									e.currentTarget.getBoundingClientRect();
								const x = e.clientX - rect.left;
								setTempCosmetics((prev) => ({
									...prev,
									preferredSide:
										x < rect.width / 2 ? "left" : "right",
								}));
							}}
						>
							<div className="absolute inset-0 flex">
								<div
									className={`relative w-1/2 h-full flex items-center justify-center transition-all duration-200 ${
										tempCosmetics.preferredSide === "left"
											? "border-t-2 border-b-2 border-white"
											: "hover:bg-black/20"
									}`}
								>
									<div
										className="absolute left-2 top-1/2 transform -translate-y-1/2 w-1 h-8 rounded transition-colors duration-200"
										style={{
											backgroundColor:
												tempCosmetics.paddleColor,
										}}
									></div>
								</div>
								<div
									className={`relative w-1/2 h-full flex items-center justify-center transition-all duration-200 ${
										tempCosmetics.preferredSide === "right"
											? "border-t-2 border-b-2 border-white"
											: "hover:bg-black/20"
									}`}
								>
									<div
										className="absolute right-2 top-1/2 transform -translate-y-1/2 w-1 h-8 rounded transition-colors duration-200"
										style={{
											backgroundColor:
												tempCosmetics.paddleColor,
										}}
									></div>
								</div>
							</div>
							<div
								className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full"
								style={{
									width: 8,
									height: 8,
									backgroundColor: tempCosmetics.ballColor,
								}}
							/>
						</div>
					</div>
					<div>
						<label className="block mb-3 text-gray-300 font-medium">
							Skin Paddle:
						</label>
						<div className="flex justify-center">
							<div className="grid grid-cols-4 gap-5">
								{[
									"#ff0000",
									"#00ff00",
									"#0000ff",
									"#ffffff",
								].map((color) => (
									<button
										key={color}
										className={`w-6 h-6 cursor-pointer border-2 rounded-md transition-all duration-200 ${
											tempCosmetics.paddleColor === color
												? "ring-2 ring-cyan-400"
												: "border-slate-600 hover:border-slate-400"
										}`}
										style={{ backgroundColor: color }}
										onClick={() =>
											setTempCosmetics((prev) => ({
												...prev,
												paddleColor: color,
											}))
										}
										aria-label={`Choisir couleur paddle ${color}`}
									/>
								))}
							</div>
						</div>
					</div>
					<div>
						<label className="block mb-3 text-gray-300 font-medium">
							Skin Balle:
						</label>
						<div className="flex justify-center">
							<div className="grid grid-cols-4 gap-5">
								{[
									"#ff0000",
									"#00ff00",
									"#0000ff",
									"#ffffff",
								].map((color) => (
									<button
										key={color}
										className={`w-6 h-6 cursor-pointer border-2 rounded-md transition-all duration-200 ${
											tempCosmetics.ballColor === color
												? "ring-2 ring-cyan-400"
												: "border-slate-600 hover:border-slate-400"
										}`}
										style={{ backgroundColor: color }}
										onClick={() =>
											setTempCosmetics((prev) => ({
												...prev,
												ballColor: color,
											}))
										}
										aria-label={`Choisir couleur balle ${color}`}
									/>
								))}
							</div>
						</div>
					</div>
				</div>
			</GameCard>
		</div>
	);
};

export default CosmeticsModal;
