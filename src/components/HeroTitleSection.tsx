  "use client";

  import heroImage from "../assets/heroimg.webp";

  export default function HeroTitleSection() {
    const backgroundImageUrl = typeof heroImage === 'string' ? heroImage : heroImage.src;
    
    return (
      <div className="w-full min-h-[350px] px-6 md:px-8 pt-12 pb-8 relative overflow-hidden border-b-2 border-yellow-500">
        {/* Background Image - Covering Whole Section */}
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat z-0"
          style={{
            backgroundImage: `url(${backgroundImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        ></div>
        
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-slate-800/70 z-[1]"></div>
        
        {/* Animated Background Shapes */}
        <div className="absolute inset-0 overflow-hidden z-[1] bgimg">
          {/* Decorative/animated white blobs */}
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full mix-blend-overlay opacity-20 blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full mix-blend-overlay opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-white rounded-full mix-blend-overlay opacity-10 blur-3xl"></div>
          {/* Background image overlayed for additional effect */}
          <img 
            src={backgroundImageUrl} 
            alt="Background Decoration"
            className="absolute inset-0 w-full h-full object-cover opacity-30 z-[-1] pointer-events-none"
            draggable={false}
            style={{ userSelect: "none" }}
          />
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-2 px-4 sm:px-6 md:px-8 text-left mt-20 sm:mt-32 md:mt-40 relative z-10">
          {/* Semi-transparent background behind text for extra readability */}
          <div className="absolute inset-0 bg-blue/40 rounded-lg -z-10 blur-sm"></div>
          <div className="">
          {/* Decorative Top Element */}
          <div className="flex justify-start mb-4 sm:mb-6">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <div className="h-1 w-8 sm:w-12 bg-yellow-500 rounded-full"></div>
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-400 rounded-full"></div>
              <div className="h-1 w-16 sm:w-24 bg-yellow-500 rounded-full"></div>
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-400 rounded-full"></div>
              <div className="h-1 w-8 sm:w-12 bg-yellow-500 rounded-full"></div>
            </div>
          </div>

          <h1 className="text-sm sm:text-base md:text-[18px] font-bold mb-4 sm:mb-6 leading-tight text-left">
            <span className="text-white bg-yellow-500 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow-lg border-2 border-yellow-400 inline-block mb-2 md:mb-0 text-xs sm:text-sm md:text-base">Adohealth Initiative</span>
            <span className="text-white block text-left md:inline-block md:ml-2 font-semibold mt-2 md:mt-0 text-xs sm:text-sm md:text-base"> : A School-Based Cluster Randomised Controlled Trial of an E-Wellness Initiative for Nurturing Healthy Lifestyle Choices among Adolescents in SAS Nagar, Punjab.</span>
          </h1>

          {/* Modern Decorative Bottom Element */}
          <div className="mt-6 sm:mt-8 flex justify-start items-center gap-2 sm:gap-4 flex-wrap">
            <div className="h-1 w-12 sm:w-16 bg-yellow-500 rounded-full"></div>
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-400 rounded-full shadow-lg"></div>
            <div className="h-1 w-24 sm:w-32 bg-yellow-500 rounded-full"></div>
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-400 rounded-full shadow-lg"></div>
            <div className="h-1 w-12 sm:w-16 bg-yellow-500 rounded-full"></div>
          </div>
          </div>
        </div>
      </div>
    );
  }
