import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: number;
  name: string;
  email: string;
  display_name: string;
  avatar?: string;
}

interface UserContextType {
  user: User | null;
  refreshUser: () => Promise<void>;
  setToken: (token: string | null) => void;
  token: string | null;
}

const UserContext = createContext<UserContextType>({
  user: null,
  refreshUser: async () => {},
  setToken: () => {},
  token: null,
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem("token");
    } catch {
      return null;
    }
  });

  const logoutUser = async (currentToken?: string | null) => {
    if (currentToken) {
      try {
        await fetch("http://localhost:3000/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${currentToken}` }
        });
      } catch (error) {
        const blob = new Blob([JSON.stringify({})], { type: "application/json" });
        navigator.sendBeacon("http://localhost:3000/logout", blob);
      }
    }
  };

  const setToken = async (newToken: string | null) => {
    if (newToken) {
      sessionStorage.setItem("token", newToken);
      setTokenState(newToken);
    } else {
      const currentToken = token;
      sessionStorage.removeItem("token");
      setTokenState(null);
      setUser(null);
      
      await logoutUser(currentToken);
    }
  };

  const refreshUser = async () => {
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const res = await fetch("http://localhost:3000/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUser({
          ...data,
          avatar: data.avatar && data.avatar.trim() !== "" ? data.avatar : "/avatars/avatar1.png",
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (token) {
        const blob = new Blob([JSON.stringify({})], { type: "application/json" });
        navigator.sendBeacon("http://localhost:3000/logout", blob);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && token) {
        const blob = new Blob([JSON.stringify({})], { type: "application/json" });
        navigator.sendBeacon("http://localhost:3000/logout", blob);
      }
    };

    const handlePageHide = () => {
      if (token) {
        const blob = new Blob([JSON.stringify({})], { type: "application/json" });
        navigator.sendBeacon("http://localhost:3000/logout", blob);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [token]);

  return (
    <UserContext.Provider value={{ user, refreshUser, setToken, token }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
