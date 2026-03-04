"use client";

import React from "react";
import {
  Mail,
  Phone,
  MapPin,
  Heart,
  Award,
  Building2
} from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative w-full overflow-hidden bg-blue-900 border-t border-white/10">
      {/* Dynamic Background Glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-[80px]"></div>
      </div>

      <div className="relative z-10 text-white pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

            {/* Left Column: Principal Investigator Info */}
            <div className="space-y-6 text-center lg:text-left">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-400 mb-4">
                  Principal Investigator
                </h3>
                <h2 className="text-2xl sm:text-3xl font-black mb-2">
                  Dr. Amrit Kaur Virk, MD
                </h2>
                <p className="text-blue-100/60 font-medium text-sm sm:text-base italic">
                  Professor & Head, Department of Community Medicine
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-4 justify-center lg:justify-start group">
                  <div className="p-2.5 bg-white/5 rounded-xl group-hover:bg-yellow-400/20 transition-colors">
                    <Building2 size={20} className="text-yellow-400" />
                  </div>
                  <p className="text-sm text-blue-100/80 leading-snug">
                    Dr BR Ambedkar State Institute of Medical Sciences (AIMS)<br />
                    <span className="text-white/40">SAS Nagar, Mohali, Punjab</span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center lg:justify-start pt-2">
                  <a href="tel:+919815140389" className="flex items-center gap-3 text-sm font-semibold hover:text-yellow-400 transition-colors">
                    <Phone size={18} className="text-yellow-400" />
                    +91-9815140389
                  </a>
                  <a href="mailto:dramritvirk@gmail.com" className="flex items-center gap-3 text-sm font-semibold hover:text-yellow-400 transition-colors">
                    <Mail size={18} className="text-yellow-400" />
                    dramritvirk@gmail.com
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column: Funding & Mission */}
            <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-400 rounded-2xl mb-6 shadow-lg shadow-yellow-400/20">
                <Award size={32} className="text-blue-900" />
              </div>
              <h3 className="text-xl font-bold mb-3">Funding & Institutional Support</h3>
              <p className="text-blue-100/70 text-sm leading-relaxed mb-6">
                Proudly funded by the <strong>Indian Council of Medical Research (ICMR)</strong>
                under the Intermediate Grant-2024.
              </p>

              <div className="flex items-center justify-center gap-2 py-3 px-6 bg-blue-800/50 rounded-full inline-flex border border-white/5">
                <Heart size={16} className="text-red-400 fill-red-400" />
                <span className="text-sm font-bold tracking-tight">AdoHealth Initiative</span>
              </div>
            </div>
          </div>

          {/* Bottom Branding */}
          <div className="mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-center gap-4">
            <p className="text-white/40 text-xs font-medium tracking-wide">
              © {currentYear} ADOHEALTH INITIATIVE • ALL RIGHTS RESERVED.
            </p>

          </div>
        </div>
      </div>
    </footer>
  );
}