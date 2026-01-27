import Image from 'next/image';

export function LaptopMockup() {
  return (
    <div className="relative mx-auto max-w-6xl">
      {/* Laptop Container with 3D perspective */}
      <div className="relative" style={{ perspective: '2000px' }}>
        {/* Laptop Screen */}
        <div
          className="relative mx-auto"
          style={{
            transform: 'rotateX(8deg) rotateY(0deg)',
            transformStyle: 'preserve-3d'
          }}
        >
          {/* Screen Bezel */}
          <div className="relative rounded-t-2xl bg-gradient-to-b from-gray-800 to-gray-900 p-3 shadow-2xl">
            {/* Browser Chrome */}
            <div className="mb-2 flex items-center gap-2 rounded-t-lg bg-gray-700 px-3 py-2">
              {/* Browser Dots */}
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
              </div>
              {/* Address Bar */}
              <div className="ml-2 flex-1 rounded bg-gray-600 px-3 py-1 text-xs text-gray-300">
                <span className="opacity-60">🔒</span>
                <span className="ml-2">pilot.beerleaguehockey.ca</span>
              </div>
            </div>

            {/* Screen Content - Pilot Site Preview */}
            <div className="relative aspect-[16/10] overflow-hidden rounded-b-lg bg-white">
              <Image
                src="/banner2.png"
                alt="Pilot League Dashboard Preview"
                fill
                className="object-cover object-top"
                priority
              />
            </div>
          </div>

          {/* Laptop Base */}
          <div
            className="relative mx-auto h-4 rounded-b-2xl bg-gradient-to-b from-gray-700 to-gray-800 shadow-xl"
            style={{ width: '110%', marginTop: '-2px' }}
          ></div>

          {/* Laptop Bottom */}
          <div
            className="mx-auto h-1.5 rounded-b-3xl bg-gray-900"
            style={{ width: '100%' }}
          ></div>
        </div>

        {/* Shadow under laptop */}
        <div
          className="absolute inset-x-0 -bottom-8 h-24 bg-gradient-radial from-gray-900/20 via-gray-900/10 to-transparent blur-2xl"
          style={{ transform: 'translateZ(-50px)' }}
        ></div>
      </div>

      {/* Floating accent elements */}
      <div className="absolute -top-4 -right-4 bg-[#16C784] text-white px-5 py-2.5 rounded-full text-base font-bold shadow-lg hidden md:block z-10">
        🏒 Professional Tools
      </div>
      <div className="absolute -bottom-12 -left-4 bg-[#1F4FD8] text-white px-5 py-2.5 rounded-full text-base font-bold shadow-lg hidden md:block z-10">
        ⚡ Setup in Minutes
      </div>
    </div>
  );
}
