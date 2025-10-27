'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import Image from 'next/image';
import MobileStatusBar from '@/components/MobileStatusBar';
import * as lottoAbiModule from '@/lib/lotto-abi-full.json';

const lottoAbi = (lottoAbiModule as any).default || lottoAbiModule;
const contractAddress = '0x1D8E07AE314204F97611e1469Ee81c64b80b47F1';
const rpcUrl = 'https://public-en-kairos.node.kaia.io';

export default function WinnersPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [availableDrawIds, setAvailableDrawIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 진행된 회차 정보 로드
  useEffect(() => {
    const loadDraws = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(contractAddress, lottoAbi, provider);
        
        const currentDrawId = await contract.currentDrawId();
        const current = Number(currentDrawId);
        
        // 현재 회차 이전의 최대 8개 회차 (최소 1회차부터)
        const draws: number[] = [];
        for (let i = Math.max(1, current - 1); i >= Math.max(1, current - 8); i--) {
          draws.push(i);
        }
        
        setAvailableDrawIds(draws);
      } catch (error) {
        console.error('회차 정보 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDraws();
  }, []);

  const handleSearch = () => {
    const drawId = parseInt(searchInput);
    if (!isNaN(drawId) && drawId > 0) {
      router.push(`/my/winners/${drawId}`);
    } else {
      alert('올바른 회차 번호를 입력해주세요.');
    }
  };

  const handleQuickSearch = (drawId: number) => {
    router.push(`/my/winners/${drawId}`);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        position: 'relative',
        background: '#380D44',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* 상단 상태바 */}
      <MobileStatusBar />

      {/* back + 회차별 당첨자 정보 텍스트 */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 'clamp(20px, 5vw, 25px)',
          position: 'relative',
        }}
      >
        <div
          onClick={() => router.push('/my')}
          style={{
            position: 'absolute',
            left: 'clamp(12px, 3vw, 15px)',
            fontSize: 'clamp(18px, 4.5vw, 20px)',
            cursor: 'pointer',
            color: 'white',
          }}
        >
          ←
        </div>
        <span
          style={{
            color: 'white',
            fontSize: 'clamp(14px, 3.5vw, 15px)',
            fontWeight: '700',
            fontFamily: 'SF Pro, Arial, sans-serif',
          }}
        >
          회차별 당첨자 정보
        </span>
      </div>

      {/* 제목/설명 */}
      <div
        style={{
          marginTop: 'clamp(40px, 10vw, 50px)',
          textAlign: 'center',
          padding: '0 clamp(12px, 3vw, 15px)',
        }}
      >
        <div
          style={{
            color: '#e9c3ee',
            fontSize: 'clamp(18px, 4.5vw, 20px)',
            fontWeight: '700',
            lineHeight: '1.4',
            fontFamily: 'SF Pro, Arial, sans-serif',
          }}
        >
          회차 번호를 입력하여
          <br />
          당첨자 정보를 확인해보세요!
        </div>
      </div>

      {/* 전체 박스 */}
      <div
        style={{
          marginTop: 'clamp(30px, 7.5vw, 35px)',
          width: 'calc(100% - clamp(24px, 6vw, 30px))',
          maxWidth: '400px',
          background: 'rgba(213, 126, 225, 0.2)',
          borderRadius: 'clamp(12px, 3vw, 15px)',
          border: '1px solid rgba(255,255,255,0.2)',
          padding: 'clamp(18px, 4.5vw, 20px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* 검색창 */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(217,217,217,0.2)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 'clamp(8px, 2vw, 10px)',
            padding: '0 clamp(10px, 2.5vw, 12px)',
            height: 'clamp(45px, 11.3vw, 50px)',
            marginBottom: 'clamp(25px, 6.3vw, 30px)',
          }}
        >
          <input
            type="number"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="회차 번호 입력 (예: 5)"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'white',
              fontSize: 'clamp(12px, 3vw, 13px)',
              fontWeight: '300',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(4px, 1vw, 5px)',
              background: 'linear-gradient(122deg, #B715BF 0%, #C10E8E 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 'clamp(8px, 2vw, 10px)',
              padding: 'clamp(7px, 1.8vw, 8px) clamp(13px, 3.3vw, 15px)',
              cursor: 'pointer',
              fontSize: 'clamp(13px, 3.3vw, 14px)',
              fontWeight: '400',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            <span>🔍</span>
            조회
          </button>
        </div>

        {/* 빠른 조회 버튼들 */}
        <div style={{ width: '100%' }}>
          <div
            style={{
              textAlign: 'left',
              color: 'white',
              fontSize: 'clamp(13px, 3.3vw, 14px)',
              marginBottom: 'clamp(8px, 2vw, 10px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            빠른 조회
          </div>
          {isLoading ? (
            <div
              style={{
                textAlign: 'center',
                color: 'white',
                fontSize: 'clamp(12px, 3vw, 13px)',
                padding: 'clamp(15px, 3.8vw, 20px)',
                opacity: 0.7,
              }}
            >
              로딩 중...
            </div>
          ) : availableDrawIds.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: 'white',
                fontSize: 'clamp(12px, 3vw, 13px)',
                padding: 'clamp(15px, 3.8vw, 20px)',
                opacity: 0.7,
              }}
            >
              아직 진행된 회차가 없습니다
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: 'clamp(8px, 2vw, 10px)',
                marginTop: 'clamp(8px, 2vw, 10px)',
                overflowX: 'auto',
                overflowY: 'hidden',
                paddingBottom: 'clamp(8px, 2vw, 10px)',
              }}
            >
              {availableDrawIds.map((drawId) => (
                <div
                  key={drawId}
                  onClick={() => handleQuickSearch(drawId)}
                  style={{
                    flex: '0 0 auto',
                    width: 'clamp(70px, 17.5vw, 75px)',
                    background: 'rgba(217,217,217,0.3)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 'clamp(8px, 2vw, 10px)',
                    textAlign: 'center',
                    padding: 'clamp(8px, 2vw, 10px) 0',
                    color: 'white',
                    fontSize: 'clamp(12px, 3vw, 13px)',
                    fontFamily: 'SF Pro, Arial, sans-serif',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  제 {drawId}회
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

