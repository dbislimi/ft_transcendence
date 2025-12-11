export const API_BASE_URL = window.location.origin;
export const WS_BASE_URL = window.location.origin.replace("http", "ws");

export const getWebSocketHost = (): string => {
	return window.location.host;
};

export const API_ENDPOINTS = {
	login: `${API_BASE_URL}/api/login`,
	register: `${API_BASE_URL}/api/register`,
	logout: `${API_BASE_URL}/api/logout`,
	me: `${API_BASE_URL}/api/me`,

	profile: `${API_BASE_URL}/api/profile`,
	updateProfile: `${API_BASE_URL}/api/profile`,

	friends: `${API_BASE_URL}/api/friends`,
	friendRequests: `${API_BASE_URL}/api/friend-requests`,
	blockedUsers: `${API_BASE_URL}/api/blocked-users`,
	blockUser: `${API_BASE_URL}/api/block-user`,

	wsChat: (token: string) => `${WS_BASE_URL}/socket.io?token=${token}`,
	wsFriends: (token: string) =>
		`${WS_BASE_URL}/api/ws-friends?token=${token}`,
};

export default API_ENDPOINTS;
