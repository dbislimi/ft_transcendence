import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import "./index.css";
import Layout from "./Components/Layout";
import * as pages from "./pages";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { BackgroundProvider } from "./contexts/BackgroundContext";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <pages.Home /> },
      { path: "/Connection", element: <pages.Connection /> },
      { path: "/Registration", element: <pages.Registration /> },
      { path: "/game", element: <pages.Game /> },
      { path: "/bomb-party", element: <pages.BombParty /> },
      { path: "/about", element: <pages.About /> },
      { path: "/auth", element: <pages.auth /> },
      { path: "/settings", element: <pages.Settings /> },
      { path: "*", element: <pages.NotFoundPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <BackgroundProvider>
        <RouterProvider router={router} />
      </BackgroundProvider>
    </AuthProvider>
  </StrictMode>
);
