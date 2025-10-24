'use client';

import { useRouter, usePathname } from 'next/navigation';
import React, { useState } from 'react';
import Image from 'next/image';

interface BottomNavProps {
  className?: string;
}

export default function BottomNav({ className = '' }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const navItems = [
    { icon: '홈.webp', label: '홈', path: '/' },
    { icon: '복권 사기.webp', label: '복권 사기', path: '/buy' },
    { icon: '복권 결과.webp', label: '복권 결과', path: '/result' },
    { icon: '마이.webp', label: '마이', path: '/my' },
  ];

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: 'clamp(70px, 9vh, 80px)',
        background: 'linear-gradient(180deg, rgba(246, 239, 252, 0.98) 0%, rgba(250, 245, 255, 0.98) 100%)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(167, 139, 250, 0.15)',
        borderTopLeftRadius: 'clamp(20px, 5vw, 28px)',
        borderTopRightRadius: 'clamp(20px, 5vw, 28px)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0 clamp(20px, 5vw, 30px)',
        boxShadow: '0 -4px 20px rgba(139, 92, 246, 0.08)',
        zIndex: 1000,
      }}
    >
      {navItems.map((item, index) => {
        const isActive = pathname === item.path;
        const isHovered = hoveredIndex === index;
        return (
          <button
            key={index}
            onClick={() => router.push(item.path)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onTouchStart={() => setHoveredIndex(index)}
            onTouchEnd={() => setHoveredIndex(null)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(4px, 1vh, 6px)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 'clamp(8px, 2vh, 12px) clamp(12px, 3vw, 16px)',
              borderRadius: 'clamp(12px, 3vw, 16px)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              transform: 'translateY(0)',
              boxShadow: 'none',
            }}
          >
            {/* 아이콘 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isActive ? 'scale(1.1)' : isHovered ? 'scale(1.05)' : 'scale(1)',
                width: 'clamp(24px, 6vw, 28px)',
                height: 'clamp(24px, 6vw, 28px)',
                position: 'relative',
                filter: isActive
                  ? 'brightness(0) saturate(100%) invert(18%) sepia(91%) saturate(7466%) hue-rotate(318deg) brightness(92%) contrast(110%)'
                  : isHovered
                  ? 'brightness(0) saturate(100%) invert(54%) sepia(93%) saturate(4729%) hue-rotate(245deg) brightness(94%) contrast(101%)'
                  : 'brightness(0) saturate(100%) invert(68%) sepia(8%) saturate(280%) hue-rotate(181deg) brightness(91%) contrast(85%)',
              }}
            >
              <Image
                src={`/img/nav/${item.icon}`}
                alt={item.label}
                width={28}
                height={28}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
                priority
              />
            </div>

            {/* 라벨 */}
            <span
              style={{
                fontSize: 'clamp(10px, 2.5vw, 12px)',
                color: isActive ? '#E700B1' : isHovered ? '#A855F7' : '#6B7280',
                fontFamily: 'SF Pro, -apple-system, BlinkMacSystemFont, Arial, sans-serif',
                fontWeight: isActive ? '700' : isHovered ? '600' : '500',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                letterSpacing: '-0.01em',
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}

    </div>
  );
}

