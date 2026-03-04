"use client";

import React from "react";
import { Sparkles } from "lucide-react";

export default function MainHero() {
  return (
    <div className="relative w-full px-4 sm:px-6 py-10 md:py-16 overflow-hidden bg-blue-900 border-b-2 border-yellow-500">

      {/* Background Decor - Reduced Opacity & Scale */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-blue-600/20 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-yellow-500/5 rounded-full blur-[80px]"></div>
      </div>

      <div className="max-w-5xl mx-auto text-center relative z-10">

        {/* Compact Project Tag */}
        <div className="mb-3 sm:mb-4 flex justify-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-full transition-all">
            <Sparkles size={12} className="text-yellow-400" />
            <span className="text-[10px] sm:text-xs font-black text-yellow-400 uppercase tracking-widest">
              ICMR Funded Project
            </span>
          </div>
        </div>

        {/* Scaled Down Heading */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] font-extrabold mb-3 sm:mb-4 leading-snug sm:leading-tight tracking-tight text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.75)]">
          Empowering <br className="sm:hidden" />
          <span className="text-yellow-400 px-2">Punjab&apos;s Youth</span>
        </h1>

        {/* Refined Description */}
        <p className="text-xs sm:text-sm md:text-base text-blue-100/85 font-medium max-w-2xl mx-auto leading-relaxed italic mb-2 sm:mb-4">
          &quot;Building healthy lifestyles today, preventing NCDs tomorrow. A
          school-based e-wellness initiative for adolescents of New Rupar,
          Punjab.&quot;
        </p>

        {/* Space for Buttons - Preserved Commented Elements */}
        {/* <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-6">
          <button className="px-6 py-3 bg-yellow-500 text-blue-900 text-sm font-black rounded-xl transition-all hover:shadow-lg active:scale-95 border-2 border-yellow-400">
            EXPLORE E-WELLNESS
          </button>

          <button className="px-6 py-3 bg-white/5 backdrop-blur-md text-white text-sm font-black rounded-xl border-2 border-white/10 transition-all hover:bg-white/10">
            LEARN MORE
          </button>
        </div>
        */}

      </div>
    </div>
  );
}