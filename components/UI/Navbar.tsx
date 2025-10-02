'use client'

import { useGlobalContext } from "@/utils/globalContext"
import Image from "next/image"
import { useState } from "react"
import Link from "next/link"
import { WalletConnect } from "../Web3/walletConnect"
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader"

export default function Navbar(){

    const {user} = useGlobalContext()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const navigateWithLoader = useNavigateWithLoader()

    const handleCreateAuctionClick = (e: React.MouseEvent) => {
        e.preventDefault()
        setIsMenuOpen(false)
        navigateWithLoader('/create')
    }

    return (
        <>
            {/* Mobile Navbar */}
            <div className="relative z-50 md:hidden">
                <div className="w-full p-4 flex justify-between items-center rounded-b-lg fixed h-12 top-0 left-0 border-b-[0.1px] border-b-secondary/50 bg-black/80 backdrop-blur-sm">
                    <h1 className="text-xl font-bold text-white">Auction House</h1>
                    
                    <div className="flex items-center gap-4">
                        {/* Profile Picture */}
                        <div className="rounded-md overflow-hidden border border-white">
                            {user ? <><Image 
                                alt="Profile Picture"
                                src={user.pfp_url}
                                width={40}
                                height={40}
                                className="w-6 aspect-square"
                            /></> : <div className="w-6 bg-white/30 animate-pulse aspect-square"></div>}
                        </div>

                        {/* Hamburger Menu Button */}
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="flex flex-col gap-1 w-6 h-6 justify-center items-center"
                        >
                            <div className={`w-4 h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
                            <div className={`w-4 h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></div>
                            <div className={`w-4 h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                <ul className={`absolute w-full top-12 ${isMenuOpen ? "" : "opacity-0 pointer-events-none"} duration-200  bg-black rounded-b-lg shadow-lg overflow-hidden z-50`}>
                    <li className="border-b border-primary/20 block px-4 py-3">
                        <a 
                        href="/create"
                        onClick={handleCreateAuctionClick}
                        className=" text-primary transition-colors cursor-pointer"
                    >
                        Create Auction
                    </a>
                    </li>
                    <li className="border-b border-primary/20 block px-4 py-3">
                        <WalletConnect/>
                    </li>
                </ul>
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
                        
                        <div className="px-4 py-3">
                            <WalletConnect/>
                        </div>
                    </nav>
                </div>

                {/* Sidebar Footer - Profile */}
                <div className="p-4 border-t border-secondary/20">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                        <div className="rounded-md overflow-hidden border border-white">
                            {user ? <><Image 
                                alt="Profile Picture"
                                src={user.pfp_url}
                                width={40}
                                height={40}
                                className="w-10 aspect-square"
                            /></> : <div className="w-10 bg-white/30 animate-pulse aspect-square"></div>}
                        </div>
                        {user && (
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{user.username}</p>
                                <p className="text-secondary text-xs">FID: {user.fid}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}