'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Trophy, Users, BarChart3 } from 'lucide-react';

interface AccordionItem {
  id: number;
  title: string;
  description: string;
  image: string;
  icon: React.ReactNode;
  color: string;
}

const accordionItems: AccordionItem[] = [
  {
    id: 1,
    title: 'Live Snake Draft',
    description: 'Run professional-style drafts with real-time player rankings, auto-pick timers, and team building tools. Make draft night legendary.',
    image: '/banner2.png', // Replace with actual draft screenshot
    icon: <Trophy className="h-6 w-6" />,
    color: '#FFD700'
  },
  {
    id: 2,
    title: 'Admin Dashboard',
    description: 'Complete league control from one dashboard. Manage games, teams, payments, and stats. Everything you need to run your league.',
    image: '/banner2.png', // Replace with actual admin screenshot
    icon: <BarChart3 className="h-6 w-6" />,
    color: '#1F4FD8'
  },
  {
    id: 3,
    title: 'Captain Tools',
    description: 'Empower team captains with roster management, line setting, and player communication. Make every captain feel like a pro GM.',
    image: '/banner2.png', // Replace with actual captain screenshot
    icon: <Users className="h-6 w-6" />,
    color: '#16C784'
  }
];

export function ImageAccordion() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row gap-2 h-[600px]">
        {accordionItems.map((item, index) => {
          const isActive = index === activeIndex;

          return (
            <div
              key={item.id}
              className={`relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-500 ease-out ${
                isActive ? 'md:flex-[4]' : 'md:flex-[1]'
              } ${
                isActive ? 'flex-[1]' : 'flex-[0.3]'
              } min-h-[120px] md:min-h-0`}
              onClick={() => setActiveIndex(index)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {/* Background Image */}
              <div className="absolute inset-0">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
                {/* Overlay */}
                <div
                  className="absolute inset-0 transition-opacity duration-500"
                  style={{
                    background: isActive
                      ? `linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)`
                      : `linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.8) 100%)`
                  }}
                />
              </div>

              {/* Content */}
              <div className="relative h-full flex flex-col justify-end p-6 md:p-8">
                {/* Icon Badge */}
                <div
                  className={`mb-4 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 ${
                    isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-75 md:opacity-100 md:scale-100'
                  }`}
                  style={{ backgroundColor: item.color }}
                >
                  <div className="text-white">
                    {item.icon}
                  </div>
                </div>

                {/* Title */}
                <h3 className={`text-white font-bold mb-2 transition-all duration-500 ${
                  isActive ? 'text-2xl md:text-3xl' : 'text-xl md:text-base'
                }`}>
                  {item.title}
                </h3>

                {/* Description - Only show when active */}
                <p className={`text-white/90 text-base md:text-lg transition-all duration-500 ${
                  isActive ? 'opacity-100 max-h-40' : 'opacity-0 max-h-0 overflow-hidden'
                }`}>
                  {item.description}
                </p>

                {/* Mobile Indicator */}
                <div className={`md:hidden mt-4 flex gap-1 transition-opacity duration-300 ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}>
                  {accordionItems.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        idx === activeIndex ? 'bg-white w-8' : 'bg-white/40 w-4'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Vertical Title for inactive items on desktop */}
              {!isActive && (
                <div className="hidden md:block absolute inset-0 flex items-center justify-center">
                  <h3
                    className="text-white font-bold text-xl transform -rotate-90 whitespace-nowrap"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                  >
                    {item.title}
                  </h3>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Indicators */}
      <div className="hidden md:flex justify-center gap-2 mt-6">
        {accordionItems.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === activeIndex ? 'bg-[#1F4FD8] w-12' : 'bg-[#E6EBF2] w-8'
            }`}
            aria-label={`View ${accordionItems[index].title}`}
          />
        ))}
      </div>
    </div>
  );
}
