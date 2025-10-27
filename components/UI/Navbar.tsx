'use client'

import { useGlobalContext } from "@/utils/providers/globalContext"
import Image from "next/image"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { WalletConnect } from "../Web3/walletConnect"
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader"
import { useRouter, usePathname } from "next/navigation"
import SearchBar from "./SearchBar"
import { RiSearchLine, RiAuctionLine, RiInformationLine, RiAddCircleLine, RiTrophyLine, RiQrScanLine } from "react-icons/ri"
import { useSession } from "next-auth/react"
import { GoDotFill } from "react-icons/go";


export default function Navbar(){

    const {user} = useGlobalContext()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const navigateWithLoader = useNavigateWithLoader()
    const pathname = usePathname()
    const mobileMenuRef = useRef<HTMLDivElement>(null)

    // Close mobile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false)
            }
        }

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isMenuOpen])

    const handleNavClick = (e: React.MouseEvent, path: string) => {
        e.preventDefault()
        setIsMenuOpen(false)
        navigateWithLoader(path)
    }

    const router = useRouter()

    const {data:session} = useSession()

    return (
        <>
            {/* Search Bar Overlay */}
            {session && <SearchBar isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}

            {/* Mobile Navbar */}
            <div className="relative z-50 lg:hidden" ref={mobileMenuRef}>
                <div className="w-full p-4 flex justify-between items-center rounded-b-lg fixed h-12 top-0 left-0 border-b-[0.1px] border-b-secondary/50 bg-black/80 backdrop-blur-sm">
                    <button onClick={()=>{router.push("/")}} className="text-xl font-bold w-8 h-8 aspect-square rounded-lg border border-primary/10 overflow-hidden"><Image src="/pfp.jpg" alt="Logo" width={32} height={32} className="scale-125" /></button>
                    
                    <div className="flex items-center gap-4">
                        {/* Search Button */}
                       {session && <button 
                            onClick={() => setIsSearchOpen(true)}
                            className="text-primary hover:text-white transition-colors"
                        >
                            <RiSearchLine className="text-xl" />
                        </button>}

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
                    <ul className={`fixed w-full top-12 ${isMenuOpen ? "" : "opacity-0 pointer-events-none"} duration-200 shadow-primary/30 bg-black/80 backdrop-blur-3xl rounded-b-lg shadow-lg overflow-hidden z-50`}>
                        <li className="border-b border-primary/50">
                            <a 
                            href="/"
                            onClick={(e) => handleNavClick(e, '/')}
                            className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors cursor-pointer w-full ${
                                pathname === '/' ? 'text-primary' : 'text-white'
                            }`}
                        >
                            <GoDotFill className="text-lg animate-pulse" />
                            Live Auctions
                        </a>
                        </li>
                        <li className="border-b border-primary/50">
                            <a 
                            href="/"
                            onClick={(e) => handleNavClick(e, '/my-auctions')}
                            className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors cursor-pointer w-full ${
                                pathname === '/my-auctions' ? 'text-primary' : 'text-white'
                            }`}
                        >
                            <RiAuctionLine className="text-lg" />
                            My Auctions
                        </a>
                        </li>
                        <li className="border-b border-primary/50">
                            <a 
                            href="/info"
                            onClick={(e) => handleNavClick(e, '/info')}
                            className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors cursor-pointer w-full ${
                                pathname === '/info' ? 'text-primary' : 'text-white'
                            }`}
                        >
                            <RiInformationLine className="text-lg" />
                            How House Works
                        </a>
                        </li>
                        <li className="border-b border-primary/50">
                            <a 
                            href="/create"
                            onClick={(e) => handleNavClick(e, '/create')}
                            className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors cursor-pointer w-full ${
                                pathname === '/create' ? 'text-primary' : 'text-white'
                            }`}
                        >
                            <RiAddCircleLine className="text-lg" />
                            Start Your Auction
                        </a>
                        </li>
                        <li className="border-b border-primary/50">
                            <a 
                            href="/leaderboard"
                            onClick={(e) => handleNavClick(e, '/leaderboard')}
                            className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors cursor-pointer w-full ${
                                pathname === '/leaderboard' ? 'text-primary' : 'text-white'
                            }`}
                        >
                            <RiTrophyLine className="text-lg" />
                            The Winner Circle
                        </a>
                        </li>
                        <li className="border-b border-primary/50">
                            <a 
                            href="/earn"
                            onClick={(e) => handleNavClick(e, '/earn')}
                            className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors cursor-pointer w-full ${
                                pathname === '/earn' ? 'text-primary' : 'text-white'
                            }`}
                        >
                            <RiQrScanLine className="text-lg" />
                            Scan to Earn
                        </a>
                        </li>
                    </ul>
                )}
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden lg:flex lg:fixed lg:left-0 lg:top-0 lg:h-full lg:w-64 lg:flex-col lg:bg-black/90 lg:backdrop-blur-sm lg:border-r lg:border-r-secondary/50 lg:z-50">
                {/* Sidebar Header */}
                <div className="p-6  flex items-center justify-between">
                <Image src="/pfp.jpg" alt="Logo" width={32} height={32} className="scale-125 border-primary/10 rounded-lg border" />
                    <button onClick={()=>{router.push("/")}} className="text-xl font-bold text-white cursor-pointer hover:text-primary transition-colors">Auction House</button>
                </div>

                {/* Search Button */}
                {session && <div className="px-4 mb-4">
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/30 transition-colors text-caption hover:text-white"
                    >
                        <RiSearchLine className="text-xl" />
                        <span>Search Users</span>
                    </button>
                </div>}

                {/* Sidebar Content */}
                <div className="flex-1 p-4">
                    <nav className="space-y-2">
                        <a 
                            href="/"
                            onClick={(e) => handleNavClick(e, '/')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                                pathname === '/' 
                                    ? 'text-primary bg-primary/20 border border-primary/30' 
                                    : 'text-primary hover:bg-primary/10'
                            }`}
                        >
                            <GoDotFill className="text-xl animate-pulse" />
                            <span className="text-md">Live Auctions</span>
                        </a>
                        
                        <a 
                            href="/"
                            onClick={(e) => handleNavClick(e, '/my-auctions')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                                pathname === '/my-auctions' 
                                    ? 'text-primary bg-primary/20 border border-primary/30' 
                                    : 'text-primary hover:bg-primary/10'
                            }`}
                        >
                            <RiAuctionLine className="text-xl" />
                            <span className="text-md">My Auctions</span>
                        </a>
                        
                        <a 
                            href="/info"
                            onClick={(e) => handleNavClick(e, '/info')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                                pathname === '/info' 
                                    ? 'text-primary bg-primary/20 border border-primary/30' 
                                    : 'text-primary hover:bg-primary/10'
                            }`}
                        >
                            <RiInformationLine className="text-xl" />
                            <span className="text-md">How House Works</span>
                        </a>
                        
                        <a 
                            href="/create"
                            onClick={(e) => handleNavClick(e, '/create')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                                pathname === '/create' 
                                    ? 'text-primary bg-primary/20 border border-primary/30' 
                                    : 'text-primary hover:bg-primary/10'
                            }`}
                        >
                            <RiAddCircleLine className="text-xl" />
                            <span className="text-md">Start Your Auction</span>
                        </a>
                        
                        <a 
                            href="/leaderboard"
                            onClick={(e) => handleNavClick(e, '/leaderboard')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                                pathname === '/leaderboard' 
                                    ? 'text-primary bg-primary/20 border border-primary/30' 
                                    : 'text-primary hover:bg-primary/10'
                            }`}
                        >
                            <RiTrophyLine className="text-xl" />
                            <span className="text-md">The Winner Circle</span>
                        </a>
                        
                        <a 
                            href="/earn"
                            onClick={(e) => handleNavClick(e, '/earn')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                                pathname === '/earn' 
                                    ? 'text-primary bg-primary/20 border border-primary/30' 
                                    : 'text-primary hover:bg-primary/10'
                            }`}
                        >
                            <RiQrScanLine className="text-xl" />
                            <span className="text-md">Scan to Earn</span>
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