import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import * as pages from "./pages";
import Layout from "./Components/Layout";
import { BackgroundProvider } from "./contexts/BackgroundContext";
import { WebSocketProvider } from "./context/WebSocketContext";
import { UserProvider } from "./context/UserContext";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <pages.Home /> },
      { path: "/Connection", element: <pages.Connection /> },
			{ path: "/Confirmation", element: <pages.Confirmation /> },
      { path: "/Registration", element: <pages.Registration /> },
      { path: "/pong", element: <pages.Pong /> },
      { path: "/bomb-party", element: <pages.BombParty /> },
      { path: "/about", element: <pages.About /> },
      { path: "/auth", element: <pages.auth /> },
      { path: "/settings", element: <pages.Settings /> },
			{ path: "/Dashboard", element: <pages.Dashboard /> },
			{ path: "/Reglages", element: <pages.Reglages /> },
			{ path: "/chat", element: <pages.chat /> },
      { path: "/profile", element: <pages.Profile /> },
      { path: "/friends", element: <pages.Friends /> },
      { path: "*", element: <pages.NotFoundPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BackgroundProvider>
      <UserProvider>
        <WebSocketProvider>
          <RouterProvider router={router} />
        </WebSocketProvider>
      </UserProvider>
    </BackgroundProvider>
  </StrictMode>
);
