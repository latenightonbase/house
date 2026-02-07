import { useMiniKit } from "@coinbase/onchainkit/minikit";
import LoginWithOAuth from "./twitterConnect";
import { useGlobalContext } from "@/utils/providers/globalContext";
import Image from "next/image";
import { Button } from "../UI/button";
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";

export default function AggregateConnector() {
    const {context} = useMiniKit();
    const {user} = useGlobalContext()
    const { getAccessToken } = usePrivy();
    const [xpStats, setXpStats] = useState<{ level: number; currentSeasonXP: number; totalXP: number } | null>(null);

    const navigate = useNavigateWithLoader();

    useEffect(() => {
        if (user) {
            const fetchXPStats = async () => {
                try {
                    const accessToken = await getAccessToken();
                    const response = await fetch('/api/leaderboard/user-stats', {
                        headers: {
                            "x-user-social-id": user.socialId,
                            'Authorization': `Bearer ${accessToken}`
                        }
                    });
                    const data = await response.json();
                    console.log('Fetched XP stats:', data);
                    if (data.success) {
                        setXpStats({
                            level: data.stats.level,
                            currentSeasonXP: data.stats.currentSeasonXP,
                            totalXP: data.stats.totalXP
                        });
                    }
                } catch (err) {
                    console.error('Failed to fetch XP stats:', err);
                }
            };
            fetchXPStats();
        }
    }, [user, getAccessToken]);


    if(context){
        if(!user){
            return null
        }

        return (
    <>
        <button onClick={() => navigate(`/profile`)} className="bg-white/10 rounded-lg p-1 flex items-center justify-start gap-2">
            <Image unoptimized src={user?.pfp_url as string} alt="Profile" className="border-2 border-primary rounded-full w-8 h-8 aspect-square" />
        </button>
    </>)
    }
    else{
return (
    <LoginWithOAuth xpStats={xpStats}/>)
    }
        
}