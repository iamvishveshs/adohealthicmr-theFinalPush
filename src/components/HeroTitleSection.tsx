"use client";

import heroImage from "../assets/heroimg.webp";

export default function HeroTitleSection() {
  const backgroundImageUrl =
    typeof heroImage === "string" ? heroImage : heroImage.src;

  return (
    <div className="relative w-full min-h-[500px] flex items-center overflow-hidden border-b-2 border-yellow-500">
      {/* Background Image Layer */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat z-0"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,0)), url(${backgroundImageUrl})`,
        }}
      ></div>

      {/* Ambient Glows */}
      <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-yellow-500/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 left-10 w-80 h-80 bg-blue-400/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8 py-20">
        <div className="max-w-4xl flex flex-col items-start gap-6">
          {/* Decorative Top Line */}
          <div className="flex gap-2">
            <div className="h-1 w-12 bg-yellow-500 rounded-full"></div>
            <div className="h-1 w-4 bg-yellow-400/50 rounded-full"></div>
          </div>

          {/* Main Badge */}
          <div className="inline-block">
            <span className="bg-yellow-500 text-blue-900 text-xs md:text-sm font-black px-4 py-2 rounded-lg shadow-xl uppercase tracking-widest border-2 border-yellow-400">
              AdoHealth Initiative
            </span>
          </div>

          <div className="relative">
            <h1
              className="text-lg md:text-xl lg:text-2xl font-black text-white leading-[1.3] text-left drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]"
              style={{ textShadow: "2px -2px 3px rgba(0, 0, 0, 0.8)" }}
            >
              A School-Based Cluster Randomised Controlled Trial of{" "}
              <br className="hidden md:block" />
              an <span className="text-yellow-400">
                e-wellness initiative
              </span>{" "}
              for Nurturing Healthy Lifestyle <br className="hidden md:block" />
              Choices among Adolescents in SAS Nagar, Punjab.
            </h1>
          </div>

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
