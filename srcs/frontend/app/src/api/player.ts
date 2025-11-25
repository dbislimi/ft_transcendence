import type { PlayerProfile } from "../types/playerProfiles";
import { API_BASE_URL } from "../config/api";

export async function fetchPlayerProfile(userId: string): Promise<PlayerProfile> {
    const res = await fetch(`${API_BASE_URL}/api/user/${userId}`, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok)
        throw new Error(`Failed to load profile for $(userId): ${res.status}`);
    const data = (await res.json()) as PlayerProfile;
    return data;
}