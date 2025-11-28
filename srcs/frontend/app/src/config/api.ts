// API Configuration
// All API calls should go through nginx reverse proxy

export const API_BASE_URL = window.location.origin;
export const WS_BASE_URL = window.location.origin.replace('http', 'ws');

export const getWebSocketHost = (): string => {
    // Always use the current browser location for WebSocket connections
    return window.location.host;
};

export const API_ENDPOINTS = {
    // Auth
    login: `${API_BASE_URL}/api/login`,
    register: `${API_BASE_URL}/api/register`,
    logout: `${API_BASE_URL}/api/logout`,
    me: `${API_BASE_URL}/api/me`,

    // Profile
    profile: `${API_BASE_URL}/api/profile`,
    updateProfile: `${API_BASE_URL}/api/profile`,

    // Friends
    friends: `${API_BASE_URL}/api/friends`,
    friendRequests: `${API_BASE_URL}/api/friend-requests`,
    blockedUsers: `${API_BASE_URL}/api/blocked-users`,
    blockUser: `${API_BASE_URL}/api/block-user`,

    // WebSocket
    wsChat: (token: string) => `${WS_BASE_URL}/socket.io?token=${token}`,
    wsFriends: (token: string) => `${WS_BASE_URL}/api/ws-friends?token=${token}`,
};

export default API_ENDPOINTS;
