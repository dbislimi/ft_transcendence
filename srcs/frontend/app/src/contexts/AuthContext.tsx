import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface User {
  id: string;
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
  login: (userData: User, token?: string) => void;
  logout: () => void;
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
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    console.log('[AuthContext] Init: user=', savedUser ? 'PRESENT' : 'MISSING', 'token=', savedToken ? 'PRESENT' : 'MISSING');
    
    // Ne considérer l'utilisateur comme authentifié QUE si user ET token existent
    if (savedUser && savedToken) {
      try {
        const userData = JSON.parse(savedUser);
        
        // Vérifier si le token n'est pas expiré
        const tokenPayload = JSON.parse(atob(savedToken.split('.')[1]));
        const expiresAt = tokenPayload.exp * 1000; // Convertir en millisecondes
        const now = Date.now();
        
        if (expiresAt < now) {
          console.warn('[AuthContext] Token expired, clearing authentication');
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          setUser(null);
          setToken(null);
          setIsAuthenticated(false);
          return;
        }
        
        setUser(userData);
        setToken(savedToken);
        setIsAuthenticated(true);
        console.log('[AuthContext] Restored authentication for user:', userData.name, '(token expires in', Math.round((expiresAt - now) / 1000 / 60), 'minutes)');
      } catch (error) {
        console.error('Erreur lors du chargement des données utilisateur:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
      }
    } else {
      // Si l'un des deux manque, nettoyer tout
      console.log('[AuthContext] Incomplete auth data, clearing');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
    }
  }, []);

  const login = (userData: User, authToken?: string) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
    if (authToken) {
      setToken(authToken);
      localStorage.setItem('token', authToken);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
