import { useMiniKit } from "@coinbase/onchainkit/minikit";
import LoginWithOAuth from "./twitterConnect";
import { useGlobalContext } from "@/utils/providers/globalContext";
import Image from "next/image";
import { Button } from "../UI/button";
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";
import { usePrivy } from "@privy-io/react-auth";

export default function AggregateConnector() {
    const {context} = useMiniKit();
    const {user} = useGlobalContext()

    const navigate = useNavigateWithLoader();


    if(context && user){
        return (
    <>
        <button onClick={() => navigate(`/user/${user?.pfp_url}`)} className="bg-white/10 rounded-full p-1 flex items-center justify-start">
            <Image unoptimized src={user?.pfp_url as string} alt="Coinbase Logo" className="border-2 border-primary rounded-full w-8 h-8 aspect-square" />
        </button>
    </>)
    }
    else if(!context && user)
        return (
    <LoginWithOAuth/>)
}