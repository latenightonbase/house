import { useMiniKit } from "@coinbase/onchainkit/minikit";
import LoginWithOAuth from "./twitterConnect";
import { useGlobalContext } from "@/utils/providers/globalContext";
import Image from "next/image";

export default function AggregateConnector() {
    const {context} = useMiniKit();
    const {user} = useGlobalContext()

    if(context?.client)
        return (
    <>
        <div className="bg-white/10 rounded-full px-2 py-1 flex items-center justify-start">
            <Image src={user.pfp_url} alt="Coinbase Logo" width={20} height={20} className="border-2 border-primary rounded-full w-8 aspect-square" />
            <span className="ml-2 text-sm font-medium">{user.username}</span>
        </div>
    </>)
    else
        return (
    <LoginWithOAuth/>)
}