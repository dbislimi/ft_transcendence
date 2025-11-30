import { useEffect, useState } from "react";
import type { PlayerProfile } from "../types/playerProfiles";
import { API_BASE_URL } from "../config/api";

export function usePlayerProfile(userId: string | null) {
    const [profile, setProfile] = useState<PlayerProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function run() {
            if (!userId)
                return;
            setLoading(true);
            setError(null);
            try {
                const token = sessionStorage.getItem("token");
                if (!token) {
                    throw new Error("No authentication token");
                }

                const response = await fetch(`${API_BASE_URL}/api/user/${userId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch profile: ${response.status}`);
                }

                const data = await response.json();
                if (!cancelled) {
                    const mappedProfile: PlayerProfile = {
                        id: String(data.id),
                        username: data.username || data.name || data.display_name || 'Unknown',
                        avatarUrl: data.avatar || data.avatarUrl || '/avatars/avatar1.png',
                        createdAt: data.created_at || data.createdAt || new Date().toISOString(),
                        totalPlayTimeMs: data.totalPlayTimeMs || 0,
                        stats: {
                            username: data.username || data.name || 'Unknown',
                            wins: data.wins || 0,
                            losses: data.losses || 0
                        }
                    };
                    setProfile(mappedProfile);
                }
            } catch (e: any) {
                if (!cancelled)
                    setError(e?.message ?? "Failed to load profile");
            } finally {
                if (!cancelled)
                    setLoading(false);
            }
        }
        run();
        return () => {
            cancelled = true;
        };
    }, [userId]);
    return { profile, loading, error };
}