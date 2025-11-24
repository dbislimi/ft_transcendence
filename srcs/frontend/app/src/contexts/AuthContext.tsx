import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface User {
  id: number;
  name: string;
  email: string;
  display_name?: string;
  avatar?: string;
  wins?: number;
  losses?: number;
  created_at?: string;
  online?: boolean;
  twoFAEnabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User, token?: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(() => {
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    setIsLoading(true);
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      console.log('[refreshUser] Appel /me avec token:', token.substring(0, 20));
      const res = await fetch('https://localhost:3001/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });


      if (res.ok) {
        const data = await res.json();
        const userData = {
          ...data,
          avatar: data.avatar && data.avatar.trim() !== '' ? data.avatar : '/avatars/avatar1.png',
        };
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        await handleLogoutCleanup();
      }
    } catch (error) {
      console.error('Erreur lors du refresh utilisateur:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logoutUser = async (currentToken?: string | null) => {
    if (currentToken) {
      try {
        await fetch('https://localhost:3001/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      } catch (error) {
        console.error('Erreur lors du logout:', error);
        const blob = new Blob([JSON.stringify({})], {
          type: 'application/json',
        });
        navigator.sendBeacon('https://localhost:3001/logout', blob);
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem('user');
      const savedToken = localStorage.getItem('token');

      if (savedUser && savedToken) {
        try {
          const userData = JSON.parse(savedUser);
          const tokenPayload = JSON.parse(atob(savedToken.split('.')[1]));
          const expiresAt = tokenPayload.exp * 1000;
          const now = Date.now();

          if (expiresAt < now) {
            await handleLogoutCleanup();
            return;
          }
          setUser(userData);
          setTokenState(savedToken);
          setIsAuthenticated(true);
          setIsLoading(false);
        } catch (error) {
          console.error('Erreur lors du chargement des donnees utilisateur:', error);
          await handleLogoutCleanup();
        }
      } else {
        setIsLoading(false);
      }
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (token && !isLoading) {
      refreshUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // useEffect(() => {
  //   const handleBeforeUnload = () => {
  //     if (token) {
  //       const blob = new Blob([JSON.stringify({})], {
  //         type: 'application/json',
  //       });
  //       console.log("use effect handleBeforeUnload");
  //       navigator.sendBeacon('https://localhost:3001/logout', blob);
  //     }
  //   };

  //   window.addEventListener('beforeunload', handleBeforeUnload);
  //   return () => {
  //     window.removeEventListener('beforeunload', handleBeforeUnload);
  //   };
  // }, [token]);

  const handleLogoutCleanup = async () => {
    const currentToken = token;
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setTokenState(null);
    setIsAuthenticated(false);
    setIsLoading(false);

    await logoutUser(currentToken);
  };

  const setToken = async (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem('token', newToken);
      setTokenState(newToken);
    } else {
      await handleLogoutCleanup();
    }
  };

  const login = (userData: User, authToken?: string) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
    if (authToken) {
      setTokenState(authToken);
      localStorage.setItem('token', authToken);
    }
  };

  const logout = async () => {
    await handleLogoutCleanup();
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
    setToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
