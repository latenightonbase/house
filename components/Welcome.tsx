
import { useGlobalContext } from "@/utils/providers/globalContext";
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";
import Image from "next/image";
import Link from "next/link";
import { FaPlus } from "react-icons/fa";

export default function Welcome() {

    const {user} = useGlobalContext();
    const navigate = useNavigateWithLoader()

    return (
            <div className="space-y-4 flex flex-col  max-lg:justify-center w-full">
                <div className="text-left text-caption flex flex-col font-semibold text-xl gap-2 mb-4">
                    Welcome to <span className="gradient-text text-3xl block font-bold">The House!</span>
                </div>
                <div className="bg-white/10 w-fit rounded-full px-2 py-1 text-xs flex items-center justify-center gap-1 text-white">by <span><Image src={`/lnob.jpg`} alt="lnob" width={20} height={20} className="w-4 aspect-square rounded-full " /></span> latenightonbase(LNOB)</div>

                <button onClick={()=>{navigate('/create')}} className= " max-lg:w-full w-80 px-6 py-3 hover:-translate-y-1 duration-200 gradient-button flex gap-2 items-center justify-center text-white rounded-md hover:bg-green-700 transition">
                    <FaPlus/> Create Auction
                </button>
            </div>

    )
}