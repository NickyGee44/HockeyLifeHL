import Image from 'next/image';

export function LaptopMockup() {
  return (
    <div className="relative mx-auto max-w-5xl mt-8">
      {/* Browser Mockup Container */}
      <div className="relative">
        {/* Browser Window */}
        <div className="relative rounded-xl overflow-hidden shadow-2xl bg-white border-2 border-[#E6EBF2]">
          {/* Browser Chrome */}
          <div className="flex items-center gap-2 bg-gray-100 px-4 py-3 border-b border-gray-200">
            {/* Browser Dots */}
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
            </div>
            {/* Address Bar */}
            <div className="ml-4 flex-1 rounded-md bg-white px-4 py-1.5 text-sm text-gray-600 border border-gray-200">
              <span className="opacity-60">🔒</span>
              <span className="ml-2">pilot.beerleaguehockey.ca</span>
            </div>
          </div>

          {/* Browser Content - Pilot Site Preview */}
          <div className="relative aspect-[16/10] bg-white">
            <Image
              src="/banner2.png"
              alt="Pilot League Dashboard Preview"
              fill
              className="object-cover object-top"
              priority
            />
          </div>
        </div>

        {/* Floating accent elements */}
        <div className="absolute -top-4 -right-4 bg-[#16C784] text-white px-5 py-2.5 rounded-full text-base font-bold shadow-lg hidden md:block z-10">
          🏒 Professional Tools
        </div>
        <div className="absolute -bottom-4 -left-4 bg-[#1F4FD8] text-white px-5 py-2.5 rounded-full text-base font-bold shadow-lg hidden md:block z-10">
          ⚡ Setup in Minutes
        </div>
      </div>
    </div>
  );
}
