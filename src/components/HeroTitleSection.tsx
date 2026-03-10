"use client";

import heroImage from "../assets/heroimg.webp";

export default function HeroTitleSection() {
  const backgroundImageUrl = typeof heroImage === 'string' ? heroImage : heroImage.src;

  return (
    <div className="relative w-full min-h-[500px] flex items-center overflow-hidden border-b-2 border-yellow-500">
      {/* Background Image Layer */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat z-0 scale-105"
        style={{
          backgroundImage: `url(${backgroundImageUrl})`,
        }}
      ></div>

      {/* Gradient Overlay - Blends the image into the blue theme */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/95 via-blue-800/80 to-transparent z-[1]"></div>

      {/* Ambient Glows */}
      <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-yellow-500/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 left-10 w-80 h-80 bg-blue-400/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8 py-20">
        <div className="max-w-4xl flex flex-col items-start gap-6">

          {/* Decorative Top Line */}
          <div className="flex items-center gap-2">
            <div className="h-1 w-12 bg-yellow-500 rounded-full"></div>
            <div className="h-1 w-4 bg-yellow-400/50 rounded-full"></div>
          </div>

          {/* Main Badge */}
          <div className="inline-block">
            <span className="bg-yellow-500 text-blue-900 text-xs md:text-sm font-black px-4 py-2 rounded-lg shadow-xl uppercase tracking-widest border-2 border-yellow-400">
              AdoHealth Initiative
            </span>
          </div>

          {/* Title Text with Glass Effect */}
          <div className="relative group">
            {/* Subtle glass background for text legibility */}
            <div className="absolute -inset-4   rounded-2xl opacity-100"></div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-[1.2] tracking-tight text-left">
              A School-Based Cluster Randomised <br className="hidden md:block" />
              Controlled Trial of an <span className="text-yellow-400">e-wellness Initiative</span> <br className="hidden md:block" />
              for Nurturing Healthy Lifestyle Choices.
            </h1>
          </div>

          {/* Location Subtext */}
          <p className="text-blue-100/80 text-sm md:text-lg font-bold tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-ping"></span>
            SAS NAGAR, PUNJAB
          </p>

          {/* Decorative Bottom Line */}
          <div className="flex items-center gap-2 mt-4">
            <div className="h-1 w-24 bg-yellow-500 rounded-full shadow-lg shadow-yellow-500/20"></div>
            <div className="h-1 w-8 bg-yellow-400/50 rounded-full"></div>
            <div className="h-1 w-4 bg-yellow-400/30 rounded-full"></div>
          </div>

        </div>
      </div>
    </div>
  );
}