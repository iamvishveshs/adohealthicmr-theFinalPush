"use client";

import Image from "next/image";
import Link from "next/link";
import icmrLogo from "../assets/Indian_Council_of_Medical_Research_Logo.svg.png";

interface HeaderProps {
  isUserLoggedIn: boolean;
  isAdmin: boolean;
  userName: string;
  onLoginClick: () => void;
  onAdminLoginClick?: () => void;
  onLogout: () => void;
  onModulesClick?: () => void;
}

export default function Header({ isUserLoggedIn, isAdmin, userName, onLoginClick, onAdminLoginClick, onLogout, onModulesClick }: HeaderProps) {
  return (
    <header className="sticky top-0 left-0 right-0 z-[100] bg-blue-800 backdrop-blur-md border-b-2 border-yellow-500 shadow-lg">
      <div className="max-w-8xl mx-auto px-2 sm:px-4 md:px-8 py-2">
      <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 flex-shrink-0">
                <Image
                  src={icmrLogo}
                  alt="ICMR Logo - Indian Council of Medical Research"
                  fill
                  sizes="48px"
                  className="object-contain"
                  priority
                  style={{ filter: 'brightness(3) contrast(1.4) invert(0)' }}
            />
              </div>
              <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-yellow-400 truncate">AdoHealth Initiative</h1>
            </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
            {onModulesClick && (isUserLoggedIn || isAdmin) && (
              <div className="relative">
                <button
                  onClick={onModulesClick}
                  className="px-2 py-1 sm:px-3 sm:py-1.5 bg-yellow-500 text-slate-900 text-xs font-semibold rounded-lg hover:bg-yellow-400 border-2 border-yellow-400 transition-all duration-200 flex items-center gap-1 sm:gap-2 relative z-10 shadow-md hover:shadow-lg"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  Modules
                </button>
              </div>
            )}
            {isAdmin && (
              <Link
                href="/users"
                className="px-2 py-1 sm:px-3 sm:py-1.5 bg-yellow-500 text-slate-900 text-xs font-semibold rounded-lg hover:bg-yellow-400 border-2 border-yellow-400 transition-all duration-200 flex items-center gap-1 sm:gap-2 relative z-10 shadow-md hover:shadow-lg"
                title="View Users"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span className="hidden sm:inline">Users</span>
              </Link>
            )}
          {isUserLoggedIn || isAdmin ? (
            <>
              {isUserLoggedIn && (
                  <span className="text-xs text-slate-800 font-medium flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 bg-slate-300 rounded-lg border-2 border-yellow-500 shadow-sm">
                  <svg width="14" height="14" className="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="hidden sm:inline">{userName}</span>
                  <span className="sm:hidden truncate max-w-[60px]">{userName.split(' ')[0]}</span>
                </span>
              )}
              {isAdmin && (
                  <span className="text-xs text-slate-800 font-medium flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 bg-slate-300 rounded-lg border-2 border-yellow-500 shadow-sm">
                  <svg width="14" height="14" className="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  <span className="hidden sm:inline">Admin</span>
                </span>
              )}
              <button
                onClick={onLogout}
                  className="px-2 py-1 sm:px-3 sm:py-1.5 bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg hover:bg-slate-400 border-2 border-slate-500 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex gap-1.5 sm:gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAdminLoginClick?.();
                }}
                className="px-2 py-1 sm:px-3 sm:py-1.5 bg-yellow-600 text-slate-900 text-xs font-semibold rounded-lg hover:bg-yellow-500 border-2 border-yellow-500 transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer relative z-50"
                type="button"
                title="Admin Login"
              >
                Admin
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onLoginClick();
                }}
                className="px-2 py-1 sm:px-3 sm:py-1.5 bg-yellow-500 text-slate-900 text-xs font-semibold rounded-lg hover:bg-yellow-400 border-2 border-yellow-400 transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer relative z-50"
                type="button"
              >
                Login
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </header>
  );
}
