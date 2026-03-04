"use client";

import React, { memo, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { LayoutGrid, Users, LogOut } from "lucide-react";
import icmrLogo from "../assets/Indian_Council_of_Medical_Research_Logo.svg.png";

interface HeaderProps {
  isUserLoggedIn: boolean;
  isAdmin: boolean;
  userName: string;
  onLoginClick: () => void;
  onAdminLoginClick?: () => void;
  onLogout: () => void;
  onModulesClick?: () => void;
  isLoading?: boolean; // NEW: Pass this from your Page/Layout
}

const Header = memo(({
  isUserLoggedIn,
  isAdmin,
  userName,
  onLoginClick,
  onAdminLoginClick,
  onLogout,
  onModulesClick,
  isLoading = false // Default to false if not provided
}: HeaderProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 left-0 right-0 z-[100] bg-blue-900 border-b border-white/10 shadow-xl transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between">

          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-3 sm:gap-4 group shrink-0">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12">
              <Image
                src={icmrLogo}
                alt="ICMR Logo"
                fill
                sizes="48px"
                className="object-contain brightness-200"
                priority
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm sm:text-lg font-black text-white uppercase leading-none tracking-tight">AdoHealth</h1>
              <span className="text-[9px] sm:text-[10px] font-bold text-yellow-400 uppercase tracking-widest mt-0.5">Initiative</span>
            </div>
          </Link>

          {/* Actions Area */}
          <div className="flex items-center gap-2 sm:gap-3 min-h-[40px]">
            {/* CRITICAL FIX: If not mounted OR if the parent is still loading auth data,
               render an empty placeholder with a fixed width to prevent "layout shift"
            */}
            {!mounted || isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-24 h-8 bg-white/5 animate-pulse no-round" />
                <div className="w-8 h-8 bg-white/5 animate-pulse no-round" />
              </div>
            ) : (
              /* ACTUAL NAVIGATION - Only shown when Auth check is 100% DONE */
              <div className="flex items-center gap-2 sm:gap-3 animate-in fade-in zoom-in-95 duration-300">
                {onModulesClick && (isUserLoggedIn || isAdmin) && (
                  <button onClick={onModulesClick} className="flex items-center gap-2 px-3 py-2 text-[10px] font-black text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all no-round uppercase tracking-widest">
                    <LayoutGrid size={14} className="text-yellow-400" />
                    <span className="hidden md:inline">Modules</span>
                  </button>
                )}

                {isAdmin && (
                  <Link href="/users" className="flex items-center gap-2 px-3 py-2 text-[10px] font-black text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all no-round uppercase tracking-widest">
                    <Users size={14} className="text-yellow-400" />
                    <span className="hidden md:inline">Users</span>
                  </Link>
                )}

                {(isUserLoggedIn || isAdmin) ? (
                  <div className="flex items-center gap-3 pl-3 border-l border-white/10 ml-1">
                    <div className="hidden lg:flex flex-col items-end">
                      <span className="text-[9px] text-white/40 font-black uppercase tracking-widest leading-none mb-1">
                        {isAdmin ? "Admin Console" : "Authorized User"}
                      </span>
                      <span className="text-[11px] font-bold text-white tracking-wide truncate max-w-[120px]">
                        {isAdmin ? "Administration" : userName}
                      </span>
                    </div>
                    <button onClick={onLogout} className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 transition-all no-round">
                      <LogOut size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button onClick={onAdminLoginClick} className="px-3 py-2 text-[10px] font-black text-white/50 hover:text-yellow-400 uppercase tracking-widest transition-colors">Admin</button>
                    <button onClick={onLoginClick} className="px-5 py-2 text-[10px] font-black text-blue-900 bg-yellow-400 hover:bg-yellow-300 no-round uppercase tracking-widest transition-all shadow-lg shadow-yellow-400/10 active:scale-95">Student Login</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <style jsx>{` .no-round { border-radius: 0px !important; } `}</style>
    </header>
  );
});

Header.displayName = "Header";
export default Header;