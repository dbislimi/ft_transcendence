import { Outlet, useLocation } from "react-router";
import Header from "./Header";
import BackgroundSurface from "./BackgroundSurface";
import ChatWidget from "./ChatWidget";
import Notifications from "./Notifications";

export default function Layout() {
	return (
		<>
			<BackgroundSurface />
			<Header />
			<main className="w-full h-full relative z-10">
				<Outlet />
			</main>
			<ChatWidget />
			<Notifications />
		</>
	);
}
