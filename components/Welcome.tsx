
import { useGlobalContext } from "@/utils/providers/globalContext";
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";
import Image from "next/image";
import { FaPlus } from "react-icons/fa";

export default function Welcome() {

    const {user} = useGlobalContext();
    const navigate = useNavigateWithLoader()

    return (
            <div className="space-y-4 flex flex-col  max-lg:justify-center w-full">
                <div className="text-left flex flex-col gap-2 mb-4">
                    <div className="text-xl font-bold text-white flex gap-2 max-lg:justify-left items-center"><span>{user?.pfp_url ? <Image width={48} height={48} src={user.pfp_url} alt="Profile Picture" className="w-12 h-12 aspect-square rounded-lg border-2 border-primary" /> : <div className="w-12 h-12 bg-primary/10 animate-pulse rounded-lg"></div>}</span> <span className="gradient-text flex">{user ? user?.username : <span className="h-6 w-20 flex rounded-md bg-primary/10 animate-pulse" ></span>}</span></div>
                    <p className="text-sm text-secondary">
                        Start exploring auctions or create your own!
                    </p>
                </div>

                <button onClick={()=>{navigate('/create')}} className= " max-lg:w-full w-80 px-6 py-3 hover:-translate-y-1 duration-200 gradient-button flex gap-2 items-center justify-center text-white rounded-md hover:bg-green-700 transition">
                    <FaPlus/> Create Auction
                </button>
            </div>

    )
}