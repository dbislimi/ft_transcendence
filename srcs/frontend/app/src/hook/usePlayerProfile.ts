import { useEffect, useState } from "react";
import type { PlayerProfile } from "../types/playerProfiles";
import { fetchPlayerProfile } from "../api/player";

export function usePlayerProfile(userId: string | null) {
    const [profile, setProfile] = useState<PlayerProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        let cancelled = false;
        async function run() {
            if (!userId)
                return ;
            setLoading(true);
            setError(null);
            try {
                const data = await fetchPlayerProfile(userId);
                if (!cancelled)
                        setProfile(data);
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