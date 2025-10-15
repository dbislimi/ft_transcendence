import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import ChatWidget from "./Chat";
import BackgroundSurface from "./BackgroundSurface";

export default function Layout() {
	// const location = useLocation();
	// const isGameRoute = location.pathname.startsWith('/game');
	// const isBombPartyRoute = location.pathname.startsWith('/bomb-party');

  const location = useLocation();
  const hiddenRoutes = ["/", "/Connection", "/Confirmation", "/Registration"];

  return (
    <>
      <Header />
			{/* <BackgroundSurface> */}
      <main className="h-full">
        <Outlet />
      </main>
			{/* </BackgroundSurface> */}
      {!hiddenRoutes.includes(location.pathname) && <ChatWidget />}
    </>
  );
}

