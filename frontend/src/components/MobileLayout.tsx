'use client';

import React, { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface MobileLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
  showStatusBar?: boolean;
}

export default function MobileLayout({
  children,
  showBottomNav = true,
  showStatusBar = true,
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
        {/* 상단 상태바 */}
        {showStatusBar && (
          <div
            style={{
              height: 'clamp(40px, 5vh, 44px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 clamp(15px, 4vw, 20px)',
              color: 'white',
              fontSize: 'clamp(13px, 3.5vw, 15px)',
              fontWeight: '600',
              background: 'transparent',
              position: 'relative',
              zIndex: 100,
            }}
          >
            <div>9:41</div>
            <div style={{ display: 'flex', gap: 'clamp(3px, 1vw, 5px)' }}>
              <div>📶</div>
              <div>📡</div>
              <div>🔋</div>
            </div>
          </div>
        )}

        {/* 메인 콘텐츠 영역 */}
        <div
          style={{
            width: '100%',
            height: showBottomNav 
              ? 'calc(100% - clamp(40px, 5vh, 44px) - clamp(60px, 8vh, 70px))' 
              : 'calc(100% - clamp(40px, 5vh, 44px))',
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

