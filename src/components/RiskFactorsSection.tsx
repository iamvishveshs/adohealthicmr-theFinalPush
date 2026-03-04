"use client";

import React from "react";
import {
  Info,
  Ban,
  Apple,
  Zap,
  MonitorOff,
  Moon,
  Brain,
} from "lucide-react";

const riskFactors = [
  {
    title: "Introduction to NCDs",
    desc: "How lifestyle choices today shape your long-term health outcomes.",
    icon: <Info size={28} />,
    color: "bg-orange-500",
  },
  {
    title: "Tobacco & Alcohol",
    desc: "Understanding COTPA laws and resisting peer pressure.",
    icon: <Ban size={28} />,
    color: "bg-red-500",
  },
  {
    title: "Unhealthy Diet",
    desc: "Swapping JUNCS foods for balanced, nutritious traditional meals.",
    icon: <Apple size={28} />,
    color: "bg-green-500",
  },
  {
    title: "Physical Inactivity",
    desc: "Aiming for 60 minutes of daily movement and traditional play.",
    icon: <Zap size={28} />,
    color: "bg-blue-500",
  },
  {
    title: "Sedentary Screen Time",
    desc: "Using S.M.A.R.T. strategies to master your digital life.",
    icon: <MonitorOff size={28} />,
    color: "bg-purple-500",
  },
  {
    title: "Poor Sleep Quality",
    desc: "The science of 8-10 hours of rest for a sharper mind.",
    icon: <Moon size={28} />,
    color: "bg-yellow-500",
  },
  {
    title: "Stress Management",
    desc: "Building resilience to master your mood and daily mind.",
    icon: <Brain size={28} />,
    color: "bg-indigo-500",
  },
];

export default function RiskFactorsSection() {
  return (
    <section className="relative w-full px-6 py-20 overflow-hidden bg-blue-700 font-sans text-white">
      {/* Soft Ambient Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-blue-500/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Centered Header Section */}
        <div className="max-w-3xl mb-16 mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-[1.1]">
            The <span className="text-yellow-400 border-b-4 border-yellow-400/30">Big-7</span> <br />
            Behavioral Risk Factors
          </h2>
          <p className="text-lg md:text-xl text-blue-100/80 leading-relaxed">
            Small changes today prevent major challenges tomorrow. Explore the
            seven pillars of adolescent health and wellness.
          </p>
        </div>

        {/* Centered Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-center">
          {riskFactors.map((factor, index) => (
            <div
              key={index}
              className={`group relative p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl
                transition-all duration-500 hover:bg-white/10 hover:border-white/30 hover:-translate-y-2
                flex flex-col items-center text-center overflow-hidden
                ${index === 6 ? "lg:col-start-2" : ""} // Centers the 7th card on desktop
              `}
            >
              {/* Subtle Numbering */}
              <span className="absolute top-2 left-1/2 -translate-x-1/2 text-8xl font-black text-white/[0.03] pointer-events-none transition-all group-hover:text-white/[0.07]">
                {index + 1}
              </span>

              <div className="relative z-10 flex flex-col items-center">
                {/* Icon Circle */}
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${factor.color} shadow-xl mb-6 transform group-hover:scale-110 transition-transform duration-500`}>
                  {factor.icon}
                </div>

                <h3 className="text-2xl font-bold mb-3 group-hover:text-yellow-400 transition-colors">
                  {factor.title}
                </h3>

                <p className="text-blue-100/70 text-base leading-relaxed max-w-[280px]">
                  {factor.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}