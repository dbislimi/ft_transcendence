import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import "./index.css";
import Layout from "./Components/Layout";
import * as pages from "./pages";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { GlobalBackgroundProvider } from "./contexts/GlobalBackgroundContext";
import { BackgroundProvider } from "./contexts/BackgroundContext";
import { SettingsProvider } from "./contexts/SettingsContext";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <pages.Home /> },
      { path: "/Connection", element: <pages.Connection /> },
      { path: "/Registration", element: <pages.Registration /> },
      { path: "/pong", element: <pages.Pong /> },
      { path: "/bomb-party", element: <pages.BombParty /> },
      { path: "/stats", element: <pages.StatsPage /> },
      { path: "/stats/bombparty", element: <pages.StatsPage /> },
      { path: "/stats/pong", element: <pages.StatsPage /> },
      { path: "/bomb-party/stats", element: <pages.BombPartyStatsPage /> },
      { path: "/bomb-party/profile", element: <pages.BombPartyProfilePage /> },
      { path: "/profile", element: <pages.Profile /> },
      { path: "/about", element: <pages.About /> },
      { path: "/auth", element: <pages.auth /> },
      { path: "/settings", element: <pages.Settings /> },
      { path: "*", element: <pages.NotFoundPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SettingsProvider>
      <GlobalBackgroundProvider>
        <BackgroundProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </BackgroundProvider>
      </GlobalBackgroundProvider>
    </SettingsProvider>
  </StrictMode>
);
