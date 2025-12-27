"use client";

import { useEffect, useRef, useState } from "react";

interface ScrollingNameProps {
  name: string;
  className?: string;
}

export default function ScrollingName({ name, className = "" }: ScrollingNameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerW = containerRef.current.clientWidth;
        const textW = textRef.current.scrollWidth;
        const isNowOverflowing = textW > containerW;
        setIsOverflowing(isNowOverflowing);
        setContainerWidth(containerW);
        setTextWidth(textW);
      }
    };

    checkOverflow();
    const timer = setTimeout(checkOverflow, 100);
    window.addEventListener("resize", checkOverflow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [name]);

  const animationDistance = isOverflowing ? textWidth - containerWidth : 0;

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      <p
        ref={textRef}
        className="whitespace-nowrap"
        style={{
          animation: isOverflowing ? 'scrollText 8s linear infinite' : 'none',
          '--scroll-distance': `-${animationDistance}px`,
        } as React.CSSProperties}
        onMouseEnter={(e) => {
          if (isOverflowing) {
            e.currentTarget.style.animationPlayState = 'paused';
          }
        }}
        onMouseLeave={(e) => {
          if (isOverflowing) {
            e.currentTarget.style.animationPlayState = 'running';
          }
        }}
      >
        {name}
      </p>
      <style jsx>{`
        @keyframes scrollText {
          0%, 10% {
            transform: translateX(0);
          }
          50%, 60% {
            transform: translateX(var(--scroll-distance));
          }
          100% {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
