
import { useGlobalContext } from "@/utils/providers/globalContext";
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";
import { FaPlus } from "react-icons/fa";

export default function Welcome() {

    const {user} = useGlobalContext();
    const navigate = useNavigateWithLoader()

    return (
        <div className="flex flex-col">
            <div className="space-y-4">
                <div className="">
                    <h1 className="text-xl font-bold text-white mb-4 flex gap-2 items-center">Welcome <span className="gradient-text flex">{user ? user?.name : <span className="h-6 w-20 flex rounded-md bg-primary/10 animate-pulse" ></span>}</span></h1>
                    <p className="text-sm text-secondary">
                        Start exploring auctions or create your own!
                    </p>
                </div>

                <button onClick={()=>{navigate('/create')}} className="px-6 py-3 hover:-translate-y-1 duration-200 bg-gradient-to-br from-green-600 via-emerald-600 to-green-800 flex gap-2 items-center justify-center w-full text-white rounded-md hover:bg-green-700 transition">
                    <FaPlus/> Create Auction
                </button>
            </div>
        </div>
    )
}