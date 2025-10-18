
import { useGlobalContext } from "@/utils/providers/globalContext";
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";
import Image from "next/image";
import { FaPlus } from "react-icons/fa";

export default function Welcome() {

    const {user} = useGlobalContext();
    const navigate = useNavigateWithLoader()

    return (
            <div className="space-y-4 flex flex-col  max-lg:justify-center w-full">
                <div className="text-left flex flex-col font-bold text-xl gap-2 mb-4">
                    Welcome to <span className="gradient-text text-2xl block">The House!</span>
                </div>

                <button onClick={()=>{navigate('/create')}} className= " max-lg:w-full w-80 px-6 py-3 hover:-translate-y-1 duration-200 gradient-button flex gap-2 items-center justify-center text-white rounded-md hover:bg-green-700 transition">
                    <FaPlus/> Create Auction
                </button>
            </div>

    )
}