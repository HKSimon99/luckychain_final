'use client';

import { useRouter, usePathname } from 'next/navigation';
import React from 'react';

interface BottomNavProps {
  className?: string;
}

export default function BottomNav({ className = '' }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { icon: '🏠', label: '홈', path: '/' },
    { icon: '🎫', label: '복권', path: '/buy' },
    { icon: '🏆', label: '결과', path: '/result' },
    { icon: '👤', label: '마이', path: '/my' },
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
        height: 'clamp(60px, 8vh, 70px)',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(0, 0, 0, 0.05)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0 clamp(15px, 4vw, 20px)',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
        zIndex: 1000,
      }}
    >
      {navItems.map((item, index) => {
        const isActive = pathname === item.path;
        return (
          <button
            key={index}
            onClick={() => router.push(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            {/* Active 인디케이터 */}
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  top: '-2px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '24px',
                  height: '3px',
                  background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)',
                  borderRadius: '0 0 3px 3px',
                }}
              />
            )}

            {/* 아이콘 */}
            <div
              style={{
                fontSize: 'clamp(20px, 5vw, 24px)',
                opacity: isActive ? 1 : 0.5,
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.2s ease',
              }}
            >
              {item.icon}
            </div>

            {/* 라벨 */}
            <span
              style={{
                fontSize: 'clamp(10px, 2.5vw, 11px)',
                color: isActive ? '#8B5CF6' : '#666',
                fontFamily: 'SF Pro, Arial, sans-serif',
                fontWeight: isActive ? '600' : '500',
                transition: 'all 0.2s ease',
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

