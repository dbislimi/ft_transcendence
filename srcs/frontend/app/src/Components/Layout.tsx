import { Outlet, useLocation } from "react-router";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import ChatWidget from "./Chat";

export default function Layout() {
  const location = useLocation();
  const hiddenRoutes = ["/", "/Connection", "/Confirmation", "/Registration"];

  return (
    <>
      <Header />
      <main className="h-full">
        <Outlet />
      </main>
      {!hiddenRoutes.includes(location.pathname) && <ChatWidget />}
    </>
  );
}

