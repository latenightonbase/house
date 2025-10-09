'use client'

import { useGlobalContext } from "@/utils/providers/globalContext"
import Image from "next/image"
import { useState } from "react"
import Link from "next/link"
import { WalletConnect } from "../Web3/walletConnect"
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader"
import { useRouter } from "next/navigation"

export default function Navbar(){

    const {user} = useGlobalContext()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const navigateWithLoader = useNavigateWithLoader()

    const handleCreateAuctionClick = (e: React.MouseEvent) => {
        e.preventDefault()
        setIsMenuOpen(false)
        navigateWithLoader('/create')
    }

    const router = useRouter()

    return (
        <>
            {/* Mobile Navbar */}
            <div className="relative z-50 md:hidden">
                <div className="w-full p-4 flex justify-between items-center rounded-b-lg fixed h-12 top-0 left-0 border-b-[0.1px] border-b-secondary/50 bg-black/80 backdrop-blur-sm">
                    <button onClick={()=>{router.push("/")}} className="text-xl font-bold text-white">AH</button>
                    
                    <div className="flex items-center gap-4">
                    

                        {/* WalletConnect or Hamburger Menu */}
                        <WalletConnect />
                        {user &&(
                            <button 
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="flex flex-col gap-1 w-6 h-6 justify-center items-center"
                            >
                                <div className={`w-4 h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
                                <div className={`w-4 h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></div>
                                <div className={`w-4 h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                {user && (
                    <ul className={`fixed w-full top-12 ${isMenuOpen ? "" : "opacity-0 pointer-events-none"} duration-200 shadow-primary/30 bg-black/10 backdrop-blur-3xl rounded-b-lg shadow-lg overflow-hidden z-50`}>
                        <li className="border-b border-primary/50 block px-4 py-3">
                            <a 
                            href="/create"
                            onClick={handleCreateAuctionClick}
                            className=" text-white font-semibold transition-colors cursor-pointer w-full"
                        >
                            Create Auction
                        </a>
                        </li>
                    </ul>
                )}
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-full md:w-64 md:flex-col md:bg-black/90 md:backdrop-blur-sm md:border-r md:border-r-secondary/50 md:z-50">
                {/* Sidebar Header */}
                <div className="p-6 border-b border-secondary/20">
                    <h1 className="text-2xl font-bold text-white">Auction House</h1>
                </div>

                {/* Sidebar Content */}
                <div className="flex-1 p-4">
                    <nav className="space-y-4">
                        <a 
                            href="/create"
                            onClick={handleCreateAuctionClick}
                            className="flex items-center px-4 py-3 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                        >
                            <span className="text-lg">Create Auction</span>
                        </a>
                        
                    </nav>
                </div>

                {/* Sidebar Footer - Profile */}
                <div className="p-4 border-t border-secondary/20">
                    <WalletConnect/>
                </div>
            </div>
        </>
    )
}