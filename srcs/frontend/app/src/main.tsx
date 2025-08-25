import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import "./index.css";
import Layout from "./Components/Layout";
import * as pages from "./pages";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <pages.Home /> },
      { path: "/Connection", element: <pages.Connection /> },
      { path: "/Registration", element: <pages.Registration /> },
      { path: "/game", element: <pages.Game /> },
      { path: "/about", element: <pages.About /> },
      { path: "/auth", element: <pages.auth /> },
      { path: "*", element: <pages.NotFoundPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
