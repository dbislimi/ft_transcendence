import { Outlet } from "react-router-dom";
import Header from "./Header";
import ParticleProvider from "./ParticleProvider";

export default function Layout() {
	return (
		<>
			{/* Particules interactives sur toutes les pages */}
			<ParticleProvider />
			
			<Header />
			<main className="h-full">
				<Outlet />
			</main>
		</>
	)
}