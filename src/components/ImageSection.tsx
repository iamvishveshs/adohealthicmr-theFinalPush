"use client";

import Image from "next/image";
import bannerImg from "../assets/bannerimg.png";

interface ImageSectionProps {
  selectedImage: string | null;
  isAdmin: boolean;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
}

export default function ImageSection({ selectedImage, isAdmin, onImageUpload, onRemoveImage }: ImageSectionProps) {
  return (
    <section className="relative w-full px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12 overflow-hidden border-b-2 border-yellow-500">
      {/* Darker Blue Background */}
      <div className="absolute inset-0 bg-blue-700"></div>

      {/* Subtle Decorative Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-5 sm:top-10 right-5 sm:right-10 w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-blue-800 rounded-full blur-3xl"></div>
        <div className="absolute bottom-5 sm:bottom-10 left-5 sm:left-10 w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-yellow-500 rounded-full blur-3xl opacity-30"></div>
      </div>

      {/* Decorative Elements */}
      {/* <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
      </div> */}

      {/* Banner Image Background */}
      <div className="w-full h-[200px] sm:h-[300px] md:h-[400px] relative">
        <Image
          src={bannerImg}
          alt="Banner"
          fill
          sizes="100vw"
          className="object-contain"
        />
      </div>

      {/* <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8">
          <div className="w-full md:w-[500px] h-[500px] bg-white/20 backdrop-blur-sm rounded-2xl overflow-hidden relative group shadow-2xl border-2 border-white/30">
            {selectedImage ? (
              <>
                <img
                  src={selectedImage}
                  alt="Uploaded"
                  className="w-full h-full object-cover"
                />
                {isAdmin && (
                  <button
                    onClick={onRemoveImage}
                    className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-all shadow-lg hover:scale-105"
                  >
                    Remove
                  </button>
                )}
              </>
            ) : (
              <label
                htmlFor="image-upload"
                className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-all"
              >
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={onImageUpload}
                  className="hidden"
                />
                <div className="text-center text-white">
                  <svg
                    className="w-20 h-20 mx-auto mb-4 group-hover:scale-110 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-base font-semibold mb-1">500 x 500</p>
                  <p className="text-sm mt-2">Click to upload image</p>
                  <p className="text-xs mt-1 text-white/80">PNG, JPG, GIF up to 10MB</p>
                </div>
              </label>
            )}
          </div>
        </div>
      </div> */}
    </section>
  );
}
