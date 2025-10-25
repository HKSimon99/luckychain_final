'use client';

import { useState, useEffect } from 'react';

export default function MobileStatusBar() {
  const [currentTime, setCurrentTime] = useState('9:41');
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);

  // 실시간 시계
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };

    updateTime(); // 초기 실행
    const interval = setInterval(updateTime, 1000); // 1초마다 업데이트

    return () => clearInterval(interval);
  }, []);

  // 배터리 정보 (브라우저 지원 시)
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        // 초기 배터리 정보
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);

        // 배터리 변경 이벤트 리스너
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });

        battery.addEventListener('chargingchange', () => {
          setIsCharging(battery.charging);
        });
      }).catch(() => {
        // 배터리 API 실패 시 기본값 유지
        console.log('Battery API not supported');
      });
    }
  }, []);

  return (
    <div
      style={{
        width: '100%',
        alignSelf: 'stretch',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'clamp(4px, 1vw, 6px) clamp(15px, 4vw, 18px)',
        background: '#380D44',
        fontSize: 'clamp(12px, 3vw, 14px)',
        fontWeight: '600',
        color: 'white',
        fontFamily: 'SF Pro, -apple-system, BlinkMacSystemFont, Arial, sans-serif',
      }}
    >
      {/* 시간 */}
      <div style={{ flex: 1, textAlign: 'left' }}>
        {currentTime}
      </div>

      {/* 상태 아이콘들 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(4px, 1vw, 6px)',
        }}
      >
        {/* 신호 강도 */}
        <svg
          width="17"
          height="11"
          viewBox="0 0 17 11"
          fill="none"
          style={{
            width: 'clamp(14px, 3.5vw, 17px)',
            height: 'auto',
          }}
        >
          <path
            d="M2 6.66699C2.55228 6.66699 3 7.11471 3 7.66699V9.66699C2.99982 10.2191 2.55218 10.667 2 10.667H1C0.447824 10.667 0.000175969 10.2191 0 9.66699V7.66699C0 7.11471 0.447715 6.66699 1 6.66699H2ZM6.66699 4.66699C7.21913 4.66717 7.66699 5.11482 7.66699 5.66699V9.66699C7.66682 10.219 7.21902 10.6668 6.66699 10.667H5.66699C5.11482 10.667 4.66717 10.2191 4.66699 9.66699V5.66699C4.66699 5.11471 5.11471 4.66699 5.66699 4.66699H6.66699ZM11.333 2.33301C11.8852 2.33301 12.3328 2.78087 12.333 3.33301V9.66699C12.3328 10.2191 11.8852 10.667 11.333 10.667H10.333C9.78098 10.6668 9.33318 10.219 9.33301 9.66699V3.33301C9.33318 2.78098 9.78098 2.33318 10.333 2.33301H11.333ZM16 0C16.5523 0 17 0.447715 17 1V9.66699C16.9998 10.2191 16.5522 10.667 16 10.667H15C14.4478 10.667 14.0002 10.2191 14 9.66699V1C14 0.447715 14.4477 0 15 0H16Z"
            fill="white"
          />
        </svg>

        {/* WiFi */}
        <svg
          width="16"
          height="11"
          viewBox="0 0 16 11"
          fill="none"
          style={{
            width: 'clamp(14px, 3.5vw, 16px)',
            height: 'auto',
          }}
        >
          <path
            d="M5.44824 8.42676C6.7289 7.34449 8.60508 7.34449 9.88574 8.42676C9.95009 8.48497 9.98748 8.56758 9.98926 8.6543C9.99092 8.74093 9.95644 8.82406 9.89453 8.88477L7.88965 10.9072C7.83087 10.9666 7.7506 11 7.66699 11C7.5834 11 7.5031 10.9666 7.44434 10.9072L5.43848 8.88477C5.37688 8.82407 5.34303 8.74072 5.34473 8.6543C5.34656 8.56762 5.3839 8.48492 5.44824 8.42676ZM2.77246 5.72949C5.53159 3.16511 9.80431 3.16517 12.5635 5.72949C12.6258 5.78963 12.6612 5.87245 12.6621 5.95898C12.6629 6.04533 12.6293 6.12818 12.5684 6.18945L11.4092 7.36035C11.2897 7.47965 11.0971 7.48151 10.9746 7.36523C10.0685 6.54547 8.88933 6.09172 7.66699 6.0918C6.4456 6.09232 5.26772 6.54616 4.3623 7.36523C4.23975 7.48158 4.04622 7.47986 3.92676 7.36035L2.76855 6.18945C2.70747 6.12825 2.67312 6.0454 2.67383 5.95898C2.67465 5.87251 2.71026 5.78961 2.77246 5.72949ZM0.0966797 3.03906C4.32849 -1.01301 11.0044 -1.01285 15.2363 3.03906C15.2976 3.09926 15.3325 3.18173 15.333 3.26758C15.3334 3.35334 15.2997 3.43622 15.2393 3.49707L14.0791 4.66699C13.9595 4.78709 13.765 4.78817 13.6436 4.66992C12.0312 3.13852 9.89158 2.28428 7.66699 2.28418C5.4421 2.28419 3.30199 3.13829 1.68945 4.66992C1.56817 4.78829 1.3744 4.7871 1.25488 4.66699L0.09375 3.49707C0.0333193 3.43619 -0.000480886 3.35331 0 3.26758C0.000565275 3.18173 0.0353775 3.09922 0.0966797 3.03906Z"
            fill="white"
          />
        </svg>

        {/* 배터리 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1px',
            position: 'relative',
          }}
        >
          {/* 배터리 외곽 */}
          <svg
            width="23"
            height="12"
            viewBox="0 0 23 12"
            fill="none"
            style={{
              width: 'clamp(20px, 5vw, 23px)',
              height: 'auto',
            }}
          >
            <rect
              opacity="0.35"
              x="0.833984"
              y="0.5"
              width="21"
              height="10.3333"
              rx="2.16667"
              fill="#380D44"
              stroke="white"
            />
          </svg>

          {/* 배터리 충전량 */}
          <div
            style={{
              position: 'absolute',
              left: 'clamp(2px, 0.5vw, 3px)',
              top: '50%',
              transform: 'translateY(-50%)',
              width: `${(batteryLevel / 100) * (23 - 6)}px`,
              maxWidth: 'calc(100% - 6px)',
              height: 'clamp(6px, 1.5vw, 7px)',
              background: batteryLevel > 20 ? 'white' : '#FF3B30',
              borderRadius: 'clamp(1px, 0.3vw, 1.5px)',
            }}
          />

          {/* 배터리 터미널 */}
          <svg
            width="2"
            height="5"
            viewBox="0 0 2 5"
            fill="none"
            style={{
              width: 'clamp(1.5px, 0.4vw, 2px)',
              height: 'auto',
              marginLeft: '-1px',
            }}
          >
            <path
              opacity="0.4"
              d="M0.333984 0.666626V4.66663C1.13872 4.32785 1.66202 3.53976 1.66202 2.66663C1.66202 1.79349 1.13872 1.0054 0.333984 0.666626Z"
              fill="white"
            />
          </svg>

          {/* 충전 중 표시 (선택적) */}
          {isCharging && (
            <div
              style={{
                position: 'absolute',
                right: 'clamp(4px, 1vw, 5px)',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 'clamp(8px, 2vw, 10px)',
              }}
            >
              ⚡
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

