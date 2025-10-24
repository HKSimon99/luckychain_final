'use client';

import React, { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface MobileLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
}

export default function MobileLayout({
  children,
  showBottomNav = true,
}: MobileLayoutProps) {
  return (
    <div
      className="mobile-layout-container"
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#1a1a1a',
        overflow: 'hidden',
      }}
    >
      {/* 반응형 모바일 프레임 */}
      <div
        className="mobile-frame"
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100vw',
          maxHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
          background: '#380D44',
        }}
      >
        {/* 메인 콘텐츠 영역 */}
        <div
          style={{
            width: '100%',
            height: showBottomNav 
              ? 'calc(100% - clamp(60px, 8vh, 70px))' 
              : '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            position: 'relative',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </div>

        {/* 하단 네비게이션 */}
        {showBottomNav && <BottomNav />}
      </div>

      <style jsx>{`
        @media (min-width: 768px) {
          .mobile-frame {
            max-width: min(402px, 100vw);
            max-height: min(874px, 100vh);
            border-radius: 20px;
            box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
          }
        }

        @media (max-width: 767px) {
          .mobile-frame {
            border-radius: 0;
            box-shadow: none;
          }
        }

        /* 가로 모드 대응 */
        @media (orientation: landscape) and (max-height: 600px) {
          .mobile-frame {
            max-height: 100vh;
          }
        }
      `}</style>
    </div>
  );
}

