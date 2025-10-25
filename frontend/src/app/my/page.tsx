'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useDisconnect } from 'wagmi';
import { useAppKit, useAppKitProvider } from '@reown/appkit/react';
import { ethers } from 'ethers';
import Image from 'next/image';
import MobileLayout from '@/components/MobileLayout';
import MobileStatusBar from '@/components/MobileStatusBar';
import * as lottoAbiModule from '@/lib/lotto-abi-full.json';

const lottoAbi = (lottoAbiModule as any).default || lottoAbiModule;
const contractAddress = '0x1D8E07AE314204F97611e1469Ee81c64b80b47F1';
const rpcUrl = 'https://public-en-kairos.node.kaia.io';

export default function MyPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();
  const { walletProvider } = useAppKitProvider('eip155');
  
  const [balance, setBalance] = useState('0');
  const [totalSpent, setTotalSpent] = useState('0');
  const [ticketCount, setTicketCount] = useState(0);
  const [nextDrawDate, setNextDrawDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 지갑 및 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      if (!isConnected || !address) {
        setIsLoading(false);
        return;
      }

      try {
        console.log('🔍 /my 페이지 데이터 로드 시작');

        // 1. 잔액 조회 (✅ Reown AppKit 패턴: walletProvider 사용)
        if (walletProvider) {
          const provider = new ethers.BrowserProvider(walletProvider as any);
          const balanceWei = await provider.getBalance(address);
          const balanceKAIA = parseFloat(ethers.formatEther(balanceWei)).toFixed(2);
          setBalance(balanceKAIA);
          console.log('💰 지갑 잔여:', balanceKAIA, 'KAIA');
        }

        // 2. 컨트랙트 연결
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(contractAddress, lottoAbi, provider);

        // 3. 티켓 가격
        const price = await contract.ticketPrice();
        const ticketPrice = ethers.formatEther(price);
        console.log('💵 티켓 가격:', ticketPrice, 'KAIA');

        // 4. 다음 추첨 시간 (홈 화면 방식 사용)
        const currentDrawId = await contract.currentDrawId();
        console.log('🎯 현재 회차:', Number(currentDrawId));
        
        try {
          // draws는 구조체를 반환하므로 인덱스로 접근
          const drawData = await contract.draws(currentDrawId);
          
          console.log('📦 Draw 원본 데이터:', drawData);
          console.log('📦 drawData[0] (endTime):', drawData[0]);
          console.log('📦 drawData[1] (status?):', drawData[1]);
          
          // drawData[0]이 endTime (BigInt)
          const endTime = Number(drawData[0] || 0);
          
          console.log('📅 회차 endTime (파싱됨):', endTime);
          
          if (endTime > 0) {
            const date = new Date(endTime * 1000);
            const formattedDate = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
            setNextDrawDate(formattedDate);
            console.log('📆 다음 추첨:', formattedDate);
          } else {
            // endTime이 0이면 현재 시간 + 7일로 표시 (임시)
            const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const formattedDate = `${futureDate.getFullYear()}.${String(futureDate.getMonth() + 1).padStart(2, '0')}.${String(futureDate.getDate()).padStart(2, '0')}`;
            setNextDrawDate(formattedDate);
            console.log('📆 다음 추첨 (예상):', formattedDate);
          }
        } catch (e) {
          console.error('⚠️ 회차 정보 조회 실패:', e);
          setNextDrawDate('-');
        }

        // 5. 내 티켓 조회 (이벤트 기반)
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 100000);
        
        console.log(`📊 블록 범위: ${fromBlock} ~ ${currentBlock}`);
        
        const filter = contract.filters.TicketPurchased(address);
        const events = await contract.queryFilter(filter, fromBlock, 'latest');
        
        const count = events.length;
        const spent = (count * parseFloat(ticketPrice)).toFixed(2);
        
        setTicketCount(count);
        setTotalSpent(spent);
        
        console.log('🎫 구매한 티켓:', count, '장');
        console.log('💸 누적 참여 금액:', spent, 'KAIA');
        console.log('✅ /my 페이지 데이터 로드 완료');

      } catch (error) {
        console.error('❌ 데이터 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [address, isConnected]);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <MobileLayout>
        <div
          style={{
            width: '100%',
            height: '100vh',
            background: '#380D44',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          <div style={{ fontSize: '20px', marginBottom: '20px' }}>🔒</div>
          <div style={{ fontSize: '16px', marginBottom: '30px' }}>지갑을 연결해주세요</div>
          <button
            onClick={() => router.push('/wallet')}
            style={{
              padding: '12px 24px',
              background: '#93EE00',
              color: '#000',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            지갑 연결하기
          </button>
        </div>
      </MobileLayout>
    );
  }

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
            fontSize: '16px',
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
          width: '100vw',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          background: '#380D44',
          overflow: 'hidden',
          fontFamily: 'SF Pro, Arial, sans-serif',
        }}
      >
      {/* 상단바 영역 (보라색 배경) */}
      <MobileStatusBar />

      {/* 헤더 (흰색 배경) */}
      <div
        style={{
          width: '100%',
          height: '49px',
          paddingLeft: '18px',
          paddingRight: '18px',
          background: 'white',
          borderBottom: '1px solid #380D44',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* 로고 */}
        <div
          onClick={() => router.push('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <Image
            src="/logo.png"
            alt="Luckychain"
            width={37}
            height={37}
            style={{ width: '37px', height: '37px' }}
          />
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#000' }}>
            Luckychain
          </div>
        </div>

        {/* 햄버거 메뉴 */}
        <div
          onClick={() => router.push('/admin')}
          style={{
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ width: '24px', height: '2px', background: '#1E293B', borderRadius: '2px' }} />
          <div style={{ width: '24px', height: '2px', background: '#1E293B', borderRadius: '2px' }} />
          <div style={{ width: '24px', height: '2px', background: '#1E293B', borderRadius: '2px' }} />
        </div>
      </div>

      {/* 프로필 박스 */}
      <div
        style={{
          position: 'absolute',
          top: '109px',
          left: 0,
          right: 0,
          width: '100%',
          paddingLeft: '18px',
          paddingRight: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* 프로필 이미지 */}
        <div
          style={{
            width: '59px',
            height: '59px',
            borderRadius: '50%',
            border: '1px solid #EDEDED',
            overflow: 'hidden',
            background: 'url(https://cdn-icons-png.flaticon.com/512/3135/3135715.png) center/cover no-repeat',
          }}
        />

        {/* 사용자 정보 */}
        <div style={{ marginLeft: '20px' }}>
          <div style={{ color: 'white', fontSize: '22px', fontWeight: '700' }}>
            {address ? formatAddress(address) : '사용자명'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.63)', fontSize: '16px', fontWeight: '200' }}>
            지갑 연결됨
          </div>
        </div>
        </div>

        {/* 지갑 선택 버튼 */}
        <button
          onClick={() => open()}
          style={{
            border: '1px solid white',
            borderRadius: '10px',
            padding: '8px 12px',
            color: 'white',
            fontSize: '11px',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          지갑 선택
        </button>
      </div>

      {/* 구매한 복권 리스트 버튼 */}
      <button
        onClick={() => router.push('/my/list')}
        style={{
          width: 'calc(100% - 36px)',
          height: '56px',
          background: '#BDDF28',
          borderRadius: '10px',
          position: 'absolute',
          top: '209px',
          left: '18px',
          right: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'black',
          fontSize: '15px',
          fontWeight: '500',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        구매한 복권 리스트
      </button>

      {/* 구분선 1 */}
      <div
        style={{
          width: 'calc(100% - 36px)',
          height: '1px',
          background: 'rgba(255,255,255,0.5)',
          position: 'absolute',
          top: '288px',
          left: '18px',
          right: '18px',
        }}
      />

      {/* 2x2 카드 그리드 */}
      <div
        style={{
          position: 'absolute',
          top: '314px',
          left: '18px',
          right: '18px',
          width: 'calc(100% - 36px)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '22px',
        }}
      >
        {/* 카드 1: 지갑 잔여 */}
        <div
          style={{
            height: '73px',
            background: 'rgba(91, 50, 152, 0.63)',
            borderRadius: '10px',
            padding: '10px 10px 10px 20px',
            color: 'white',
            fontSize: '13px',
            fontWeight: '700',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div>지갑 잔여</div>
          <div style={{ marginTop: '5px', fontSize: '16px', fontWeight: '400' }}>
            {balance} KAIA
          </div>
        </div>

        {/* 카드 2: 누적 참여 금액 */}
        <div
          style={{
            height: '73px',
            background: 'rgba(114, 63, 94, 0.61)',
            borderRadius: '10px',
            padding: '10px 10px 10px 20px',
            color: 'white',
            fontSize: '13px',
            fontWeight: '700',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div>누적 참여 금액</div>
          <div style={{ marginTop: '5px', fontSize: '16px', fontWeight: '400' }}>
            {totalSpent} KAIA
          </div>
        </div>

        {/* 카드 3: 다음 추첨 */}
        <div
          style={{
            height: '73px',
            background: 'rgba(123, 55, 102, 0.71)',
            borderRadius: '10px',
            padding: '10px 10px 10px 20px',
            color: 'white',
            fontSize: '13px',
            fontWeight: '700',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div>다음 추첨</div>
          <div style={{ marginTop: '5px', fontSize: '16px', fontWeight: '400' }}>
            {nextDrawDate || '-'}
          </div>
        </div>

        {/* 카드 4: 참여 횟수 */}
        <div
          style={{
            height: '73px',
            background: 'rgba(60, 69, 122, 0.78)',
            borderRadius: '10px',
            padding: '10px 10px 10px 20px',
            color: 'white',
            fontSize: '13px',
            fontWeight: '700',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div>참여 횟수</div>
          <div style={{ marginTop: '5px', fontSize: '16px', fontWeight: '400' }}>
            {ticketCount}
          </div>
        </div>
      </div>

      {/* 구분선 2 */}
      <div
        style={{
          width: 'calc(100% - 36px)',
          height: '1px',
          background: 'rgba(255,255,255,0.5)',
          position: 'absolute',
          top: '512px',
          left: '18px',
          right: '18px',
        }}
      />

      {/* 버튼 1: 회차별 당첨자 정보 */}
      <button
        onClick={() => router.push('/result')}
        style={{
          width: 'calc(100% - 36px)',
          height: '53px',
          position: 'absolute',
          top: '545px',
          left: '18px',
          right: '18px',
          background: 'linear-gradient(136deg, #700B8C 0%, #B91189 100%)',
          borderRadius: '10px',
          color: 'white',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '15px',
          fontWeight: '500',
          cursor: 'pointer',
        }}
      >
        회차별 당첨자 정보
      </button>

      {/* 버튼 2: 보상 수령 내역 */}
      <button
        onClick={() => {
          alert('보상 수령 내역 페이지는 개발 예정입니다.');
        }}
        style={{
          width: 'calc(100% - 36px)',
          height: '53px',
          position: 'absolute',
          top: '620px',
          left: '18px',
          right: '18px',
          background: 'linear-gradient(136deg, #700B8C 0%, #B91189 100%)',
          borderRadius: '10px',
          color: 'white',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '15px',
          fontWeight: '500',
          cursor: 'pointer',
        }}
      >
        보상 수령 내역
      </button>

      {/* 하단 네비게이션은 MobileLayout에서 자동 표시됨 */}
      </div>
    </MobileLayout>
  );
}
