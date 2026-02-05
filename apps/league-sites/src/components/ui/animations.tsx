'use client';

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';

// ============================================================================
// FADE IN COMPONENT
// ============================================================================
// Fades in children on scroll with optional stagger support for lists

interface FadeInProps {
  children: ReactNode;
  delay?: number; // Delay in ms
  duration?: number; // Duration in ms
  staggerIndex?: number; // For staggered animations in lists
  staggerDelay?: number; // Delay between staggered items in ms
  className?: string;
  threshold?: number; // Intersection observer threshold (0-1)
}

export function FadeIn({
  children,
  delay = 0,
  duration = 500,
  staggerIndex = 0,
  staggerDelay = 100,
  className = '',
  threshold = 0.1,
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  const totalDelay = delay + staggerIndex * staggerDelay;

  const style: CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
    transition: `opacity ${duration}ms ease-out ${totalDelay}ms, transform ${duration}ms ease-out ${totalDelay}ms`,
  };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

// ============================================================================
// SLIDE IN COMPONENT
// ============================================================================
// Slides in from a specified direction with spring-like animation

type SlideDirection = 'left' | 'right' | 'up' | 'down';

interface SlideInProps {
  children: ReactNode;
  direction?: SlideDirection;
  delay?: number;
  duration?: number;
  distance?: number; // Distance in pixels
  className?: string;
  threshold?: number;
}

export function SlideIn({
  children,
  direction = 'left',
  delay = 0,
  duration = 600,
  distance = 50,
  className = '',
  threshold = 0.1,
}: SlideInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  const getTransform = () => {
    if (isVisible) return 'translate(0, 0)';
    switch (direction) {
      case 'left':
        return `translateX(-${distance}px)`;
      case 'right':
        return `translateX(${distance}px)`;
      case 'up':
        return `translateY(-${distance}px)`;
      case 'down':
        return `translateY(${distance}px)`;
    }
  };

  const style: CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: getTransform(),
    transition: `opacity ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
  };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

// ============================================================================
// SCALE IN COMPONENT
// ============================================================================
// Scales up with a spring animation

interface ScaleInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  initialScale?: number;
  className?: string;
  threshold?: number;
}

export function ScaleIn({
  children,
  delay = 0,
  duration = 500,
  initialScale = 0.9,
  className = '',
  threshold = 0.1,
}: ScaleInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  const style: CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'scale(1)' : `scale(${initialScale})`,
    transition: `opacity ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
  };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

// ============================================================================
// GLOW EFFECT COMPONENT
// ============================================================================
// Adds hover glow effect using league colors

interface GlowEffectProps {
  children: ReactNode;
  className?: string;
  intensity?: 'subtle' | 'medium' | 'strong';
  color?: 'primary' | 'secondary' | 'accent' | 'custom';
  customColor?: string;
}

export function GlowEffect({
  children,
  className = '',
  intensity = 'medium',
  color = 'primary',
  customColor,
}: GlowEffectProps) {
  const getGlowColor = () => {
    if (customColor) return customColor;
    switch (color) {
      case 'primary':
        return 'var(--league-primary)';
      case 'secondary':
        return 'var(--league-secondary)';
      case 'accent':
        return 'var(--league-accent)';
      default:
        return 'var(--league-primary)';
    }
  };

  const getGlowSize = () => {
    switch (intensity) {
      case 'subtle':
        return '15px';
      case 'medium':
        return '25px';
      case 'strong':
        return '40px';
    }
  };

  return (
    <div
      className={`glow-effect ${className}`}
      style={
        {
          '--glow-color': getGlowColor(),
          '--glow-size': getGlowSize(),
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

// ============================================================================
// SHIMMER EFFECT COMPONENT
// ============================================================================
// Loading shimmer effect for skeleton states

interface ShimmerEffectProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export function ShimmerEffect({
  width = '100%',
  height = '1rem',
  borderRadius = '0.5rem',
  className = '',
}: ShimmerEffectProps) {
  return (
    <div
      className={`shimmer-effect ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius,
      }}
      aria-hidden="true"
    />
  );
}

// ============================================================================
// SHIMMER CARD COMPONENT
// ============================================================================
// Pre-built shimmer card for loading states

interface ShimmerCardProps {
  lines?: number;
  hasImage?: boolean;
  className?: string;
}

export function ShimmerCard({
  lines = 3,
  hasImage = false,
  className = '',
}: ShimmerCardProps) {
  return (
    <div className={`shimmer-card ${className}`}>
      {hasImage && (
        <ShimmerEffect height={200} borderRadius="0.75rem 0.75rem 0 0" />
      )}
      <div className="p-4 space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <ShimmerEffect
            key={i}
            height={i === 0 ? '1.5rem' : '1rem'}
            width={i === lines - 1 ? '60%' : '100%'}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// PULSE RING COMPONENT
// ============================================================================
// Pulsing ring animation for live indicators

interface PulseRingProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'live' | 'primary' | 'success' | 'warning';
  className?: string;
}

export function PulseRing({
  size = 'md',
  color = 'live',
  className = '',
}: PulseRingProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2';
      case 'md':
        return 'w-3 h-3';
      case 'lg':
        return 'w-4 h-4';
    }
  };

  const getColorClass = () => {
    switch (color) {
      case 'live':
        return 'pulse-ring-live';
      case 'primary':
        return 'pulse-ring-primary';
      case 'success':
        return 'pulse-ring-success';
      case 'warning':
        return 'pulse-ring-warning';
    }
  };

  return (
    <span className={`pulse-ring ${getSizeClasses()} ${getColorClass()} ${className}`}>
      <span className="pulse-ring-inner" />
      <span className="pulse-ring-outer" />
    </span>
  );
}

// ============================================================================
// LIVE INDICATOR COMPONENT
// ============================================================================
// Combined live indicator with pulse ring and label

interface LiveIndicatorProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LiveIndicator({
  label = 'LIVE',
  size = 'md',
  className = '',
}: LiveIndicatorProps) {
  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'md':
        return 'text-sm';
      case 'lg':
        return 'text-base';
    }
  };

  return (
    <div className={`live-indicator ${getFontSize()} ${className}`}>
      <PulseRing size={size} color="live" />
      <span className="live-indicator-label">{label}</span>
    </div>
  );
}

// ============================================================================
// RANK CHANGE INDICATOR COMPONENT
// ============================================================================
// Shows animated up/down arrows for rank changes

interface RankChangeIndicatorProps {
  change: number; // Positive = moved up, negative = moved down, 0 = no change
  className?: string;
}

export function RankChangeIndicator({
  change,
  className = '',
}: RankChangeIndicatorProps) {
  if (change === 0) {
    return (
      <span className={`rank-indicator rank-unchanged ${className}`}>
        <span className="rank-indicator-dash">-</span>
      </span>
    );
  }

  const isUp = change > 0;

  return (
    <span className={`rank-indicator ${isUp ? 'rank-up' : 'rank-down'} ${className}`}>
      <svg
        className="rank-indicator-arrow"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d={isUp ? 'M12 4L4 14h16L12 4z' : 'M12 20l8-10H4l8 10z'}
          fill="currentColor"
        />
      </svg>
      <span className="rank-indicator-value">{Math.abs(change)}</span>
    </span>
  );
}

// ============================================================================
// STAGGERED LIST COMPONENT
// ============================================================================
// Wrapper for rendering lists with staggered animations

interface StaggeredListProps {
  children: ReactNode[];
  staggerDelay?: number;
  duration?: number;
  className?: string;
}

export function StaggeredList({
  children,
  staggerDelay = 50,
  duration = 400,
  className = '',
}: StaggeredListProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(15px)',
            transition: `opacity ${duration}ms ease-out ${index * staggerDelay}ms, transform ${duration}ms ease-out ${index * staggerDelay}ms`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
