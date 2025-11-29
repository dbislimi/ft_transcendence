import { Children, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import * as pages from "./pages";
import Layout from "./Components/Layout";
import { GlobalBackgroundProvider } from "./contexts/GlobalBackgroundContext";
import { BackgroundProvider } from "./contexts/BackgroundContext";
import { WebSocketProvider } from "./context/WebSocketContext";
import { UserProvider } from "./context/UserContext";
import { NotificationProvider } from "./context/NotificationContext";
import { GameSessionProvider } from "./context/GameSessionContext";
import { GameSettingsProvider } from "./context/GameSettingsContext";
import ProtectedRoute from "./Components/ProtectedRoute";
import { SettingsProvider } from "./contexts/SettingsContext";

const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
		{
			element: <ProtectedRoute />,
			children: [
				{ path: "/friends", element: <pages.Friends />},
				{ path: "/profile", element: <pages.Profile />},
				{ path: "/profile/:name", element: <pages.ProfileChat /> },
				{ path: "/stats", element: <pages.StatsPage /> },
				{ path: "/stats/bombparty", element: <pages.StatsPage /> },
				{ path: "/stats/pong", element: <pages.StatsPage /> },
				{ path: "/bomb-party/stats", element: <pages.BombPartyStatsPage /> },
				{ path: "/auth", element: <pages.auth /> },
				{ path: "/google-callback", element: <pages.GoogleCallback /> },
			],
		},
		{ path: "/settings", element: <pages.Settings /> },
        { path: "/", element: <pages.Home /> },
        { path: "/Connection", element: <pages.Connection /> },
        { path: "/Registration", element: <pages.Registration /> },
        { path: "/pong", element: <pages.Pong /> },
        { path: "/bomb-party", element: <pages.BombParty /> },
        { path: "/about", element: <pages.About /> },
        { path: "*", element: <pages.NotFoundPage /> },
      ],
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  }
);

// createRoot(document.getElementById("root")!).render(
//   <StrictMode>
//     <SettingsProvider>
//       <GlobalBackgroundProvider>
//         <BackgroundProvider>
//           <AuthProvider>
//             <UserProvider>
//               <WebSocketProvider>
//                 <NotificationProvider>
//                   <GameSessionProvider>
//                     <RouterProvider router={router} />
//                   </GameSessionProvider>
//                 </NotificationProvider>
//               </WebSocketProvider>
//             </UserProvider>
//           </AuthProvider>
//         </BackgroundProvider>
//       </GlobalBackgroundProvider>
//     </SettingsProvider>
//   </StrictMode>
// );

createRoot(document.getElementById("root")!).render(
  <SettingsProvider>
    <GlobalBackgroundProvider>
      <BackgroundProvider>
        <UserProvider>
          <WebSocketProvider>
            {/* <FriendsProvider> */}
            <NotificationProvider>
              <GameSessionProvider>
                <GameSettingsProvider>
                  <RouterProvider router={router} />
                </GameSettingsProvider>
              </GameSessionProvider>
            </NotificationProvider>
            {/* </FriendsProvider> */}
          </WebSocketProvider>
        </UserProvider>
      </BackgroundProvider>
    </GlobalBackgroundProvider>
  </SettingsProvider>
);
