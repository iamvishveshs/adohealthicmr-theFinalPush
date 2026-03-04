"use client";

import heroImage from "../assets/heroimg.webp";

export default function HeroTitleSection() {
  const backgroundImageUrl = typeof heroImage === 'string' ? heroImage : heroImage.src;

  return (
    <div className="relative w-full min-h-[380px] md:min-h-[440px] flex items-center overflow-hidden border-b-2 border-yellow-500">
      {/* Background Image Layer */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat z-0 scale-105 brightness-75"
        style={{
          backgroundImage: `url(${backgroundImageUrl})`,
        }}
      ></div>

      {/* Gradient Overlay - Soft dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/35 to-transparent z-[1]"></div>

      {/* Ambient Glows */}
      <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-yellow-500/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 left-10 w-80 h-80 bg-blue-400/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-6xl px-5 sm:px-6 md:pl-10 lg:pl-16 md:pr-6 py-14 md:py-18">
        <div className="max-w-4xl flex flex-col items-start gap-4 md:gap-5">

          {/* Decorative Top Line */}
          <div className="flex items-center gap-2">
            <div className="h-1 w-12 bg-yellow-500 rounded-full"></div>
            <div className="h-1 w-4 bg-yellow-400/50 rounded-full"></div>
          </div>

          {/* Main Badge */}
          <div className="inline-block">
            <span className="bg-yellow-500 text-blue-900 text-[10px] sm:text-xs md:text-sm font-black px-3 py-1.5 rounded-lg shadow-xl uppercase tracking-[0.22em] border-2 border-yellow-400">
              AdoHealth Initiative
            </span>
          </div>

          {/* Title Text */}
          <div className="relative">
            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-extrabold text-white leading-relaxed tracking-tight text-left max-w-3xl">
              A School-Based Cluster Randomised Controlled Trial of an <span className="text-yellow-400">E-Wellness Initiative</span> for Nurturing Healthy Lifestyle Choices among Adolescents in SAS Nagar, Punjab.
            </h1>
          </div>

          {/* Bottom Dots */}
          <div className="flex items-center gap-3 mt-6">
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
          </div>

        </div>
      </div>
    </div>
  );
}