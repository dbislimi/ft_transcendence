import type { PlayerProfile } from "../types/playerProfiles";

export async function fetchPlayerProfile(userId: string): Promise<PlayerProfile> {
    const res = await fetch(`https://localhost:3001/api/users/${userId}`, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok)
        throw new Error(`Failed to load profile for $(userId): ${res.status}`);
    const data = (await res.json()) as PlayerProfile;
    return data;
}