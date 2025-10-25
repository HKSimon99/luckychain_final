'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import Image from 'next/image';
import MobileLayout from '@/components/MobileLayout';
import MobileStatusBar from '@/components/MobileStatusBar';
import * as lottoAbiModule from '@/lib/lotto-abi-full.json';

const lottoAbi = (lottoAbiModule as any).default || lottoAbiModule;
const contractAddress = '0x1D8E07AE314204F97611e1469Ee81c64b80b47F1';
const rpcUrl = 'https://public-en-kairos.node.kaia.io';

export default function ResultPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [selectedDrawId, setSelectedDrawId] = useState(0);
  const [winningNumbers, setWinningNumbers] = useState<number[]>([]);
  const [myTicketCount, setMyTicketCount] = useState(0);
  const [totalPrize, setTotalPrize] = useState('0');
  const [isWinner, setIsWinner] = useState(false);
  const [myRank, setMyRank] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(contractAddress, lottoAbi, provider);

        // 현재 회차
        const currentDrawId = await contract.currentDrawId();
        const drawId = Number(currentDrawId) > 1 ? Number(currentDrawId) - 1 : Number(currentDrawId);
        setSelectedDrawId(drawId);

        // 당첨 번호 조회
        const numbers: number[] = [];
        for (let i = 0; i < 6; i++) {
          const num = await contract.winningNumbers(drawId, i);
          numbers.push(Number(num));
        }
        setWinningNumbers(numbers);

        // 내 티켓 조회 (당첨 확인)
        if (isConnected && address) {
          const currentBlock = await provider.getBlockNumber();
          const fromBlock = Math.max(0, currentBlock - 100000);
          
          const filter = contract.filters.TicketPurchased(address);
          const events = await contract.queryFilter(filter, fromBlock, 'latest');

          // 선택된 회차의 티켓만
          const myDrawTickets = events.filter((e: any) => Number(e.args[2] || e.args.drawId) === drawId);
          setMyTicketCount(myDrawTickets.length);

          // 당첨 여부 확인
          if (numbers.some(n => n > 0)) {
            for (const event of myDrawTickets) {
              const eventData = event as any;
              const ticketNumbers = Array.from(eventData.args[3] || eventData.args.numbers || []).map((n: any) => Number(n));
              
              const matchCount = ticketNumbers.filter((n: number) => numbers.includes(n)).length;
              
              if (matchCount >= 2) {
                setIsWinner(true);
                if (matchCount === 6) setMyRank('1등');
                else if (matchCount === 5) setMyRank('2등');
                else if (matchCount === 4) setMyRank('3등');
                else if (matchCount === 3) setMyRank('4등');
                else if (matchCount === 2) setMyRank('5등');
                break;
              }
            }
          }
        }

      } catch (error) {
        console.error('❌ 데이터 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [address, isConnected]);

  if (isLoading) {
    return (
      <MobileLayout>
        <div
          style={{
            width: '100%',
            height: '100vh',
            background: '#380D44',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          로딩 중...
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div
        style={{
          width: '100%',
          maxWidth: '402px',
          height: '100vh',
          position: 'relative',
          background: '#380D44',
          overflow: 'hidden',
          margin: '0 auto',
          fontFamily: 'Noto Sans KR, SF Pro, Arial, sans-serif',
        }}
      >
        {/* 하단 연보라색 영역 */}
        <div
          style={{
            width: '100%',
            height: '513px',
            position: 'absolute',
            bottom: 0,
            background: '#CAACC7',
            borderTopLeftRadius: '30px',
            borderTopRightRadius: '30px',
          }}
        />

        {/* 상단 상태바 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
          }}
        >
          <MobileStatusBar />
        </div>

        {/* 회차 제목 */}
        <div
          style={{
            color: 'white',
            fontWeight: '900',
            fontSize: '17px',
            position: 'absolute',
            top: '60px',
            width: '100%',
            textAlign: 'center',
            zIndex: 5,
          }}
        >
          {selectedDrawId} 회차 결과
        </div>

        {/* 트로피 이미지 */}
        <div
          style={{
            width: '110px',
            height: '110px',
            position: 'absolute',
            top: '110px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 5,
            fontSize: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          🏆
        </div>

        {/* 축하 문구 */}
        <div
          style={{
            position: 'absolute',
            top: '240px',
            width: '100%',
            textAlign: 'center',
            color: 'white',
            fontSize: '24px',
            fontWeight: '900',
            zIndex: 5,
          }}
        >
          {isWinner ? '당첨을 축하합니다!' : '결과를 확인하세요'}
        </div>

        {/* 서브 텍스트 */}
        <div
          style={{
            position: 'absolute',
            top: '275px',
            width: '100%',
            textAlign: 'center',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: 5,
          }}
        >
          {isWinner ? '상금은 지갑으로 전송되었습니다' : '당첨 번호를 확인하세요'}
        </div>

        {/* Blockchain Explorer 박스 */}
        <div
          style={{
            width: '340px',
            height: '90px',
            background: 'white',
            borderRadius: '15px',
            position: 'absolute',
            top: '330px',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.2)',
            zIndex: 5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              color: '#740078',
              fontSize: '18px',
              fontWeight: '800',
            }}
          >
            Blockchain Explorer
          </div>
          <div
            style={{
              color: '#4C4C4C',
              fontSize: '11px',
              marginTop: '5px',
              lineHeight: '18px',
              fontWeight: '500',
            }}
          >
            거래가 블록체인 네트워크에<br />
            적법하게 기록되고 위변조되지 않음을 검증합니다.
          </div>
        </div>

        {/* 당첨 번호 영역 */}
        <div
          style={{
            width: '360px',
            height: '100px',
            background: 'rgba(255, 255, 255, 0.35)',
            borderRadius: '15px',
            position: 'absolute',
            top: '455px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 20px',
            zIndex: 5,
          }}
        >
          {/* 라벨 */}
          <div
            style={{
              color: '#1A1A1A',
              fontWeight: '700',
              fontSize: '14px',
              marginBottom: '10px',
            }}
          >
            당첨 번호
          </div>

          {/* 번호들 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* 왼쪽 화살표 */}
            <div
              style={{
                color: 'white',
                fontSize: '20px',
                fontWeight: 'bold',
                margin: '0 5px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              &lt;
            </div>

            {/* 번호 박스들 */}
            {winningNumbers.length > 0 ? (
              winningNumbers.map((num, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '40px',
                    height: '40px',
                    background: idx === 0 ? '#F2B705' : '#5C2B82',
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: '700',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {num}
                </div>
              ))
            ) : (
              <div style={{ color: '#1A1A1A', fontSize: '14px' }}>당첨 번호 대기 중</div>
            )}

            {/* 오른쪽 화살표 */}
            <div
              style={{
                color: 'white',
                fontSize: '20px',
                fontWeight: 'bold',
                margin: '0 5px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              &gt;
            </div>
          </div>
        </div>

        {/* 구매 정보 1 */}
        <div
          style={{
            width: '340px',
            position: 'absolute',
            top: '570px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            justifyContent: 'space-between',
            color: 'black',
            fontSize: '15px',
            fontWeight: '500',
            zIndex: 5,
          }}
        >
          <span>구매 장수</span>
          <span>{myTicketCount}장</span>
        </div>

        {/* 구매 정보 2 */}
        <div
          style={{
            width: '340px',
            position: 'absolute',
            top: '600px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            justifyContent: 'space-between',
            color: 'black',
            fontSize: '15px',
            fontWeight: '500',
            zIndex: 5,
          }}
        >
          <span>등수</span>
          <span>{isWinner ? myRank : '-'}</span>
        </div>

        {/* 당첨자 정보 버튼 */}
        <button
          onClick={() => {
            alert('당첨자 정보 상세 페이지는 개발 예정입니다.');
          }}
          style={{
            width: '360px',
            height: '55px',
            position: 'absolute',
            top: '690px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #530768 0%, #B91189 100%)',
            borderRadius: '10px',
            color: 'white',
            fontSize: '18px',
            fontWeight: '700',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 5,
          }}
        >
          당첨자 정보
        </button>
      </div>
    </MobileLayout>
  );
}
