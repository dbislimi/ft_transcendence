import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth, type User } from "./AuthContext";
import { API_BASE_URL } from "../config/api";

export interface Friend {
  id: number;
  display_name: string;
  avatar?: string;
  online?: number | boolean;
  status?: string;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  friends: Friend[];
  refreshFriends: () => Promise<void>;
  isOnline: (userId: number) => boolean;
  updateAvatar: (newAvatarUrl: string) => void;
}

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user, isLoading, refreshUser: authRefreshUser } = useAuth();

  const [friends, setFriends] = useState<Friend[]>([]);

  const refreshUser = authRefreshUser;

  const updateAvatar = (newAvatarUrl: string) => {
    if (user) {
      authRefreshUser();
    }
  };

  const refreshFriends = useCallback(async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(data);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des amis:", err);
    }
  }, [token]);

  const isOnline = (userId: number): boolean => {
    const friend = friends.find(f => f.id === userId);
    if (!friend) return false;
    return friend.online === true || friend.online === 1;
  };

  useEffect(() => {
    if (token) {
      refreshFriends();
    } else {
      setFriends([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const handleFriendsMessage = (event: CustomEvent) => {
      const data = event.detail;

      switch (data.type) {
        case "connected":
          break;

        case "friend_request_received":
        case "friend_request_accepted":
        case "friend_request_rejected":
        case "friend_removed":
        case "user_blocked":
          refreshFriends();
          window.dispatchEvent(new CustomEvent('refreshFriendRequests'));
          break;

        case "status_update":
          setFriends(prev => prev.map(friend =>
            friend.id === data.userId
              ? { ...friend, online: data.online }
              : friend
          ));
          break;
      }
    };

    window.addEventListener('friendsWebSocketMessage', handleFriendsMessage as EventListener);
    return () => {
      window.removeEventListener('friendsWebSocketMessage', handleFriendsMessage as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <UserContext.Provider value={{
      user,
      isLoading,
      refreshUser,
      friends,
      refreshFriends,
      isOnline,
      updateAvatar
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used inside UserProvider");
  }
  return context;
};

