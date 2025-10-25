'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { useAccount } from 'wagmi';
import { useAppKitProvider } from '@reown/appkit/react';
import { useKaiaPrice } from '@/contexts/KaiaPriceContext';
import MobileLayout from '@/components/MobileLayout';
import MobileStatusBar from '@/components/MobileStatusBar';
import * as lottoAbiModule from '@/lib/lottoAbi.json';

const lottoAbi = (lottoAbiModule as any).default || lottoAbiModule;
const contractAddress = '0x1D8E07AE314204F97611e1469Ee81c64b80b47F1';

interface TicketSet {
  id: number;
  numbers: number[];
}

export default function BuyTicketPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  const { kaiaPrice } = useKaiaPrice();
  
  const [step, setStep] = useState<'select' | 'numbers'>('select'); // 단계: 선택 or 번호입력
  const [quantity, setQuantity] = useState(1);
  const [mode, setMode] = useState<'자동' | '수동'>('자동');
  const [ticketSets, setTicketSets] = useState<TicketSet[]>([{ id: 1, numbers: [] }]);
  const [currentSetId, setCurrentSetId] = useState(1);
  const [ticketPrice, setTicketPrice] = useState('10');
  const [isLoading, setIsLoading] = useState(false);

  // 티켓 가격 조회
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const provider = new ethers.JsonRpcProvider('https://public-en-kairos.node.kaia.io');
        const contract = new ethers.Contract(contractAddress, lottoAbi, provider);
        const price = await contract.ticketPrice();
        setTicketPrice(ethers.formatEther(price));
      } catch (error) {
        console.error('가격 조회 실패:', error);
      }
    };
    fetchPrice();
  }, []);

  // 수량 조절 (제한 없음)
  const increase = () => setQuantity(prev => prev + 1);
  const decrease = () => setQuantity(prev => (prev > 1 ? prev - 1 : prev));
  const setQuick = (num: number) => setQuantity(num);
  const reset = () => setQuantity(1);
  const handleQuantityInput = (value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num >= 1) {
      setQuantity(num);
    }
  };

  // 자동 번호 생성
  const generateAutoNumbers = (): number[] => {
    const numbers: number[] = [];
    while (numbers.length < 6) {
      const random = Math.floor(Math.random() * 45) + 1;
      if (!numbers.includes(random)) {
        numbers.push(random);
      }
    }
    return numbers.sort((a, b) => a - b);
  };

  // 구매 처리
  const handlePurchase = async (sets: TicketSet[]) => {
    if (!isConnected || !address) {
      alert('지갑을 먼저 연결해주세요!');
      router.push('/wallet');
      return;
    }

    // 모든 세트가 6개의 번호를 가지고 있는지 검증
    const incompleteSets = sets.filter(set => set.numbers.length !== 6);
    if (incompleteSets.length > 0) {
      alert(`모든 티켓에 6개의 번호를 선택해주세요! (미완성: ${incompleteSets.length}개)`);
      return;
    }

    setIsLoading(true);

    try {
      // ✅ Reown AppKit 패턴: walletProvider 사용 (모바일 지원)
      if (!walletProvider) {
        throw new Error('지갑 프로바이더를 찾을 수 없습니다. 지갑을 다시 연결해주세요.');
      }

      const provider = new ethers.BrowserProvider(walletProvider as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, lottoAbi, signer);

      // 번호 배열 생성 및 검증 (uint8[6][] 형식으로 변환)
      const numbersArray = sets.map(set => {
        // 각 번호가 1-45 범위인지 확인
        const validNumbers = set.numbers.filter(n => n >= 1 && n <= 45);
        if (validNumbers.length !== 6) {
          throw new Error('잘못된 번호가 포함되어 있습니다.');
        }
        // uint8 배열로 명시적 변환 (정확히 6개)
        return validNumbers.slice(0, 6).map(n => Math.floor(n));
      });

      const totalCost = ethers.parseEther((parseFloat(ticketPrice) * sets.length).toString());

      console.log('🎫 티켓 구매 시작:');
      console.log('  - 수량:', sets.length);
      console.log('  - 번호 배열:', JSON.stringify(numbersArray));
      console.log('  - 각 티켓:', numbersArray.map((nums, i) => `${i+1}번: [${nums.join(', ')}]`));
      console.log('  - 총 비용:', ethers.formatEther(totalCost), 'KAIA');

      // 컨트랙트 호출 전 최종 검증
      if (numbersArray.length === 0) {
        throw new Error('티켓이 없습니다.');
      }
      
      for (let i = 0; i < numbersArray.length; i++) {
        if (!Array.isArray(numbersArray[i]) || numbersArray[i].length !== 6) {
          throw new Error(`${i+1}번째 티켓의 번호가 올바르지 않습니다.`);
        }
        for (let j = 0; j < numbersArray[i].length; j++) {
          if (typeof numbersArray[i][j] !== 'number' || numbersArray[i][j] < 1 || numbersArray[i][j] > 45) {
            throw new Error(`${i+1}번째 티켓의 ${j+1}번째 번호가 올바르지 않습니다: ${numbersArray[i][j]}`);
          }
        }
      }

      console.log('✅ 검증 통과! 트랜잭션 전송 중...');

      // tokenURIs 배열 생성 (빈 문자열 배열)
      const tokenURIs = new Array(numbersArray.length).fill('');

      console.log('📝 TokenURIs:', tokenURIs);

      const tx = await contract.buyTicketBatch(numbersArray, tokenURIs, {
        value: totalCost,
        gasLimit: 500000n * BigInt(sets.length),
      });

      console.log('⏳ 트랜잭션 대기 중...', tx.hash);
      const receipt = await tx.wait();
      
      console.log('✅ 구매 완료!');
      
      // 최근 구매한 티켓의 트랜잭션 해시 저장
      if (receipt && receipt.hash) {
        sessionStorage.setItem('recentPurchaseTxHash', receipt.hash);
        console.log('💾 트랜잭션 해시 저장:', receipt.hash);
      }
      
      alert('🎉 복권 구매 완료!');
      router.push('/fortune');
    } catch (error: any) {
      console.error('❌ 구매 실패:', error);
      alert(`구매 실패: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 다음 단계 처리
  const handleNext = () => {
    if (mode === '자동') {
      // 자동 모드: 즉시 티켓 생성 및 구매
      const newSets: TicketSet[] = [];
      for (let i = 0; i < quantity; i++) {
        newSets.push({
          id: i + 1,
          numbers: generateAutoNumbers(),
        });
      }
      setTicketSets(newSets);
      handlePurchase(newSets);
    } else {
      // 수동 모드: 번호 선택 화면으로 전환
      const newSets: TicketSet[] = [];
      for (let i = 0; i < quantity; i++) {
        newSets.push({ id: i + 1, numbers: [] });
      }
      setTicketSets(newSets);
      setCurrentSetId(1);
      setStep('numbers');
    }
  };

  // 번호 선택/해제
  const toggleNumber = (number: number) => {
    setTicketSets((prev) =>
      prev.map((set) => {
        if (set.id === currentSetId) {
          if (set.numbers.includes(number)) {
            return { ...set, numbers: set.numbers.filter((n) => n !== number) };
          } else if (set.numbers.length < 6) {
            return { ...set, numbers: [...set.numbers, number].sort((a, b) => a - b) };
          }
        }
        return set;
      })
    );
  };

  // 수동 모드에서 다음/구매
  const handleManualNext = () => {
    const currentSet = ticketSets.find(set => set.id === currentSetId);
    if (!currentSet || currentSet.numbers.length < 6) {
      alert('6개의 번호를 모두 선택해주세요!');
      return;
    }

    if (currentSetId < quantity) {
      setCurrentSetId(currentSetId + 1);
    } else {
      handlePurchase(ticketSets);
    }
  };

  const getCurrentSet = () => ticketSets.find((set) => set.id === currentSetId);
  const selectedNumbers = getCurrentSet()?.numbers || [];

  return (
    <MobileLayout>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: '85px',
          background: '#380D44',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
      {/* 상단 상태바 */}
      <MobileStatusBar />

      {/* 뒤로가기 + 제목 */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2vh 0',
          position: 'relative',
        }}
      >
        <div
          onClick={() => router.push('/')}
          style={{
            position: 'absolute',
            left: '4vw',
            cursor: 'pointer',
            fontSize: 'clamp(18px, 4.5vw, 22px)',
            color: 'white',
          }}
        >
          ←
        </div>
        <span style={{ color: 'white', fontSize: 'clamp(14px, 3.5vw, 15px)', fontWeight: 700 }}>
          복권 사기
        </span>
      </div>

      {/* 선택 모드 (기본 화면) */}
      {step === 'select' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-evenly',
            padding: '0 4vw',
            overflow: 'hidden',
          }}
        >
          {/* 카이아 코인 설명 박스 */}
          <div
            style={{
              width: '100%',
              background: '#685584',
              borderRadius: '2vw',
              padding: '1.8vh 3vw',
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ fontSize: 'clamp(12px, 3vw, 13px)', fontWeight: 500, marginBottom: '0.8vh' }}>
              💡 카이아(KAIA) 코인이란?
            </div>
            <div style={{ fontSize: 'clamp(9px, 2.3vw, 10px)', fontWeight: 300, lineHeight: '1.6' }}>
              카이아 블록체인 기반 디지털 자산으로 안전하고 빠른 거래를 지원합니다. 
              복권 1장당 {ticketPrice} KAIA로 구매할 수 있으며, 시장 상황에 따라 가치가 변동될 수 있습니다다.
            </div>
          </div>

          {/* 구매 개수 박스 */}
          <div
            style={{
              width: '100%',
              background: 'linear-gradient(330deg, #87056D 0%, #55036b 64%)',
              border: '1px solid rgba(255,255,255,0.5)',
              borderRadius: '3vw',
              padding: '2vh 4vw',
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* 제목 */}
            <div style={{ 
              fontSize: 'clamp(13px, 3.3vw, 14px)', 
              fontWeight: 700, 
              textAlign: 'center', 
              marginBottom: '1.5vh',
            }}>
              구매 개수
              <br />
              <span style={{ fontSize: 'clamp(9px, 2.3vw, 10px)', fontWeight: 350 }}>
                (원하는 만큼 구매 가능)
              </span>
            </div>

            {/* - [숫자 입력] + */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '2vw',
                padding: '1.2vh 4vw',
                width: '100%',
                marginBottom: '1.5vh',
              }}
            >
              <button
                onClick={decrease}
                style={{
                  width: '6vw',
                  height: '6vw',
                  borderRadius: '50%',
                  background: '#ede3e3',
                  border: 'none',
                  color: '#000',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                }}
              >
                -
              </button>
              
              {/* 숫자 직접 입력 가능 */}
              <input
                type="number"
                value={quantity}
                onChange={(e) => handleQuantityInput(e.target.value)}
                min="1"
                style={{ 
                  width: '15vw', 
                  textAlign: 'center', 
                  fontSize: 'clamp(15px, 3.8vw, 16px)', 
                  fontWeight: 600,
                  background: 'rgba(255,255,255,0.3)',
                  border: '1px solid rgba(255,255,255,0.5)',
                  borderRadius: '1.5vw',
                  color: 'white',
                  padding: '1vh',
                }}
              />
              
              <button
                onClick={increase}
                style={{
                  width: '6vw',
                  height: '6vw',
                  borderRadius: '50%',
                  background: '#fff',
                  border: 'none',
                  color: '#000',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                }}
              >
                +
              </button>
            </div>

            {/* 빠른 선택 버튼 (Radio 스크롤) */}
            <div style={{ 
              display: 'flex', 
              overflowX: 'auto', 
              gap: '2vw',
              width: '100%', 
              marginBottom: '1.5vh',
              paddingBottom: '0.5vh',
            }}>
              {[1, 5, 10, 20, 30, 50, 100].map((num) => (
                <button
                  key={num}
                  onClick={() => setQuick(num)}
                  style={{
                    minWidth: '15vw',
                    padding: '1.2vh 3vw',
                    borderRadius: '1.5vw',
                    background: quantity === num
                      ? 'linear-gradient(135deg, #C453F5 0%, #FF00B7 100%)'
                      : 'rgba(255, 255, 255, 0.2)',
                    border: quantity === num ? '2px solid #FF00B7' : 'none',
                    color: '#fff',
                    fontSize: 'clamp(11px, 2.8vw, 12px)',
                    fontWeight: quantity === num ? '700' : '400',
                    cursor: 'pointer',
                  }}
                >
                  {num} 장
                </button>
              ))}
            </div>

            {/* 흰색 선 */}
            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.5)', margin: '1vh 0' }}></div>

            {/* 티켓 가격 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                fontSize: 'clamp(12px, 3vw, 13px)',
                fontWeight: 600,
                color: '#FFD900',
                marginTop: '0.5vh',
              }}
            >
              <span>티켓 가격</span>
              <span>{(quantity * parseFloat(ticketPrice)).toFixed(1)} KAIA</span>
            </div>
          </div>

          {/* 구매 방식 박스 */}
          <div
            style={{
              width: '100%',
              background: 'linear-gradient(330deg, #87056D 0%, #55036b 64%)',
              border: '1px solid rgba(255,255,255,0.5)',
              borderRadius: '3vw',
              padding: '2vh 4vw',
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ 
              fontSize: 'clamp(13px, 3.3vw, 14px)', 
              fontWeight: 700, 
              textAlign: 'center', 
              marginBottom: '1.5vh',
            }}>
              구매 방식
            </div>

            {/* 자동 / 수동 */}
            <div style={{ display: 'flex', width: '100%', gap: '4vw', marginBottom: '1.5vh' }}>
              {(['자동', '수동'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setMode(type)}
                  style={{
                    flex: 1,
                    height: '4.5vh',
                    borderRadius: '1.5vw',
                    border: 'none',
                    background:
                      mode === type
                        ? 'linear-gradient(135deg, #C453F5 0%, #FF00B7 100%)'
                        : 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: 'clamp(13px, 3.3vw, 14px)',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* 설명 박스 */}
            <div
              style={{
                width: '100%',
                background: 'rgba(88, 92, 138, 0.51)',
                color: '#fff',
                fontWeight: 300,
                textAlign: 'center',
                borderRadius: '1.5vw',
                padding: '1.2vh 3vw',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: 'clamp(8px, 2vw, 9px)',
                lineHeight: '1.4',
              }}
            >
              {mode === '자동'
                ? '포춘쿠키를 통해 행운의 메시지와 함께 번호가 생성됩니다'
                : '1 ~ 45 중 6개의 번호를 직접 선택할 수 있습니다'}
            </div>
          </div>

          {/* 다음 버튼 */}
          <button
            onClick={handleNext}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '2.2vh 0',
              background: isLoading 
                ? '#666' 
                : 'linear-gradient(135deg, #93EE00 0%, #7BC800 100%)',
              color: '#000',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontWeight: 700,
              border: 'none',
              borderRadius: '2vw',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? '처리 중...' : mode === '자동' ? '🎲 자동 구매하기' : '✏️ 번호 선택하기'}
          </button>

        </div>
      )}

      {/* 수동 모드 - 번호 선택 화면 */}
      {step === 'numbers' && mode === '수동' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '0 4vw',
            paddingTop: '2vh',
            paddingBottom: '2vh',
            overflow: 'hidden',
          }}
        >
          {/* 뒤로가기 버튼 */}
          <button
            onClick={() => setStep('select')}
            style={{
              alignSelf: 'flex-start',
              padding: '1vh 3vw',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '1.5vw',
              fontSize: 'clamp(11px, 2.8vw, 12px)',
              cursor: 'pointer',
              marginBottom: '2vh',
            }}
          >
            ← 뒤로가기
          </button>

          {/* 번호 선택 박스 */}
          <div
            style={{
              width: '100%',
              flex: 1,
              background: 'linear-gradient(330deg, #87056D 0%, #55036b 64%)',
              border: '1px solid rgba(255,255,255,0.5)',
              borderRadius: '3vw',
              padding: '2.5vh 4vw',
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* 진행 상황 */}
            <div style={{ 
              fontSize: 'clamp(12px, 3vw, 13px)', 
              fontWeight: 600, 
              textAlign: 'center', 
              marginBottom: '2vh',
              color: '#FFD900',
            }}>
              {currentSetId} / {quantity} 세트
            </div>

            {/* 선택된 번호 표시 */}
            <div style={{ 
              fontSize: 'clamp(11px, 2.8vw, 12px)', 
              marginBottom: '2vh',
              textAlign: 'center',
              padding: '1.5vh 3vw',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '1.5vw',
            }}>
              선택된 번호: {selectedNumbers.length > 0 ? selectedNumbers.join(', ') : '없음'}
            </div>

            {/* 번호 그리드 (1-45) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(9, 1fr)',
                gap: '1.5vw',
                marginBottom: '2vh',
                flex: 1,
                alignContent: 'start',
              }}
            >
              {Array.from({ length: 45 }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => toggleNumber(num)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '50%',
                    background: selectedNumbers.includes(num)
                      ? 'linear-gradient(135deg, #C453F5 0%, #FF00B7 100%)'
                      : 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    border: 'none',
                    fontSize: 'clamp(10px, 2.5vw, 11px)',
                    fontWeight: selectedNumbers.includes(num) ? 700 : 400,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* 현재 세트 자동 생성 버튼 */}
            <button
              onClick={() => {
                const autoNumbers = generateAutoNumbers();
                setTicketSets((prev) =>
                  prev.map((set) =>
                    set.id === currentSetId ? { ...set, numbers: autoNumbers } : set
                  )
                );
              }}
              style={{
                width: '100%',
                padding: '1.5vh 0',
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '1.5vw',
                fontSize: 'clamp(11px, 2.8vw, 12px)',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '2vh',
              }}
            >
              🎲 자동 생성
            </button>

            {/* 다음/구매 버튼 */}
            <button
              onClick={handleManualNext}
              disabled={selectedNumbers.length < 6 || isLoading}
              style={{
                width: '100%',
                padding: '2vh 0',
                background:
                  selectedNumbers.length < 6 || isLoading
                    ? '#666'
                    : 'linear-gradient(135deg, #93EE00 0%, #7BC800 100%)',
                color: selectedNumbers.length < 6 || isLoading ? '#999' : '#000',
                fontSize: 'clamp(13px, 3.3vw, 14px)',
                fontWeight: 700,
                border: 'none',
                borderRadius: '2vw',
                cursor: selectedNumbers.length < 6 || isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading
                ? '처리 중...'
                : currentSetId < quantity
                ? `다음 세트 (${currentSetId + 1}/${quantity})`
                : '🎫 구매하기'}
            </button>
          </div>
        </div>
      )}
      </div>
    </MobileLayout>
  );
}
