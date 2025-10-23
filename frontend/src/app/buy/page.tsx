'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import MobileLayout from '@/components/MobileLayout';
import * as lottoAbiModule from '../../../lib/lottoAbi.json';

const lottoAbi = (lottoAbiModule as any).default || lottoAbiModule;
const contractAddress = '0x1D8E07AE314204F97611e1469Ee81c64b80b47F1';

interface TicketSet {
  id: number;
  numbers: number[];
}

export default function BuyTicketPage() {
  const router = useRouter();
  const [ticketSets, setTicketSets] = useState<TicketSet[]>([{ id: 1, numbers: [] }]);
  const [currentSetId, setCurrentSetId] = useState(1);
  const [ticketPrice, setTicketPrice] = useState('0.01');
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseCount, setPurchaseCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // 지갑 연결 확인 및 티켓 가격 로드
  useEffect(() => {
    const init = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAddress(accounts[0]);

            // 잔액 조회
            const balanceHex = await window.ethereum.request({
              method: 'eth_getBalance',
              params: [accounts[0], 'latest'],
            });
            setBalance((parseInt(balanceHex, 16) / 1e18).toFixed(4));

            // 티켓 가격 조회
            const provider = new ethers.JsonRpcProvider('https://public-en-kairos.node.kaia.io');
            const contract = new ethers.Contract(contractAddress, lottoAbi, provider);
            const price = await contract.ticketPrice();
            setTicketPrice(ethers.formatEther(price));
          }
        } catch (error) {
          console.error('초기화 실패:', error);
        }
      }
    };

    init();
  }, []);

  // 현재 세트 가져오기
  const getCurrentSet = () => ticketSets.find((set) => set.id === currentSetId);
  const selectedNumbers = getCurrentSet()?.numbers || [];

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

  // 자동 선택 (현재 세트)
  const autoSelect = () => {
    const numbers: number[] = [];
    while (numbers.length < 6) {
      const random = Math.floor(Math.random() * 45) + 1;
      if (!numbers.includes(random)) {
        numbers.push(random);
      }
    }
    setTicketSets((prev) =>
      prev.map((set) => (set.id === currentSetId ? { ...set, numbers: numbers.sort((a, b) => a - b) } : set))
    );
  };

  // 자동 선택 (여러 장)
  const autoSelectMultiple = (count: number) => {
    const newSets: TicketSet[] = [];
    for (let i = 0; i < count; i++) {
      const numbers: number[] = [];
      while (numbers.length < 6) {
        const random = Math.floor(Math.random() * 45) + 1;
        if (!numbers.includes(random)) {
          numbers.push(random);
        }
      }
      newSets.push({ id: ticketSets.length + i + 1, numbers: numbers.sort((a, b) => a - b) });
    }
    setTicketSets([...ticketSets, ...newSets]);
    setCurrentSetId(newSets[newSets.length - 1].id);
  };

  // 세트 추가
  const addSet = () => {
    const newId = Math.max(...ticketSets.map((s) => s.id)) + 1;
    setTicketSets([...ticketSets, { id: newId, numbers: [] }]);
    setCurrentSetId(newId);
  };

  // 세트 삭제
  const removeSet = (id: number) => {
    if (ticketSets.length === 1) {
      alert('최소 1장은 있어야 합니다!');
      return;
    }
    setTicketSets((prev) => prev.filter((set) => set.id !== id));
    if (currentSetId === id) {
      setCurrentSetId(ticketSets[0].id);
    }
  };

  // 초기화
  const clearSelection = () => {
    setTicketSets([{ id: 1, numbers: [] }]);
    setCurrentSetId(1);
  };

  // 지갑 연결
  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask를 설치해주세요!');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAddress(accounts[0]);

      const balanceHex = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [accounts[0], 'latest'],
      });
      setBalance((parseInt(balanceHex, 16) / 1e18).toFixed(4));

      // 티켓 가격 조회
      const provider = new ethers.JsonRpcProvider('https://public-en-kairos.node.kaia.io');
      const contract = new ethers.Contract(contractAddress, lottoAbi, provider);
      const price = await contract.ticketPrice();
      setTicketPrice(ethers.formatEther(price));
    } catch (error) {
      console.error('지갑 연결 실패:', error);
      alert('지갑 연결에 실패했습니다.');
    }
  };

  // 구매하기
  const handleBuy = async () => {
    // 완성된 티켓만 필터링 (6개 번호를 모두 선택한 티켓)
    const completedTickets = ticketSets.filter((set) => set.numbers.length === 6);
    
    if (completedTickets.length === 0) {
      alert('구매할 티켓이 없습니다!\n최소 1개 티켓의 번호(6개)를 선택해주세요.');
      return;
    }

    // 미완성 티켓이 있으면 알림
    const incompleteCount = ticketSets.length - completedTickets.length;
    if (incompleteCount > 0) {
      const confirm = window.confirm(
        `완성된 티켓 ${completedTickets.length}개만 구매합니다.\n(미완성 ${incompleteCount}개는 제외)\n\n계속하시겠습니까?`
      );
      if (!confirm) return;
    }

    if (!address) {
      alert('지갑을 먼저 연결해주세요!');
      await connectWallet();
      return;
    }

    try {
      setIsLoading(true);
      setPurchaseCount(0);
      setTotalCount(completedTickets.length);

      console.log('🎫 티켓 구매 시작...');
      console.log('- 구매 장수:', completedTickets.length);
      console.log('- 지갑 주소:', address);

      // 읽기용 Provider (일반 RPC - 안정적)
      const readProvider = new ethers.JsonRpcProvider('https://public-en-kairos.node.kaia.io');
      const readContract = new ethers.Contract(contractAddress, lottoAbi, readProvider);

      // 회차 확인 (안정적인 RPC로)
      let currentDrawId;
      let draw;
      
      try {
        console.log('📋 회차 정보 확인 중...');
        currentDrawId = await readContract.currentDrawId();
        draw = await readContract.draws(currentDrawId);
        console.log('✅ 회차 확인 성공:', currentDrawId.toString());
        console.log('📋 현재 회차:', currentDrawId.toString());
        console.log('📋 판매 가능:', draw.isOpenForSale);
        
        if (!draw.isOpenForSale) {
          alert('❌ 현재 판매 중인 회차가 없습니다!\n\n관리자에게 문의하여 회차를 생성하고 판매를 시작해주세요.');
          setIsLoading(false);
          return;
        }
      } catch (error: any) {
        console.error('❌ 회차 확인 실패:', error);
        alert('❌ 회차 정보를 확인할 수 없습니다!\n\n관리자에게 문의해주세요.');
        setIsLoading(false);
        return;
      }

      // 쓰기용 Provider (MetaMask - 트랜잭션 전송용)
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();

      // 잔액 확인
      const balance = await browserProvider.getBalance(address);
      const totalPriceWei = ethers.parseEther(ticketPrice) * BigInt(completedTickets.length);
      const totalPrice = (parseFloat(ticketPrice) * completedTickets.length).toFixed(4);

      if (balance < totalPriceWei) {
        alert(
          `❌ 잔액이 부족합니다!\n필요: ${totalPrice} KAIA (${completedTickets.length}장)\n현재: ${ethers.formatEther(balance)} KAIA`
        );
        setIsLoading(false);
        return;
      }

      // 트랜잭션용 컨트랙트 (signer 연결)
      const contract = new ethers.Contract(contractAddress, lottoAbi, signer);

      console.log('🎫 buyTicketBatch로 일괄 구매 중... (총 ' + completedTickets.length + '장)');

      // numbersArray와 tokenURIs 준비 (완성된 티켓만)
      const numbersArray = completedTickets.map(set => set.numbers);
      const tokenURIs = completedTickets.map((_, i) => `ipfs://luckychain-ticket-${Date.now()}-${i}`);

      console.log('📦 번호 배열:', numbersArray);
      console.log('🏷️ URI 배열:', tokenURIs);

      // 한 번의 트랜잭션으로 모든 티켓 구매!
      const tx = await contract.buyTicketBatch(
        numbersArray,
        tokenURIs,
        {
          value: totalPriceWei,
          gasLimit: 500000n + (BigInt(completedTickets.length) * 300000n), // 티켓 수에 비례한 가스 설정
        }
      );

      console.log('✅ 트랜잭션 전송 완료:', tx.hash);
      
      alert(
        `📤 트랜잭션 전송 완료!\n\nHash: ${tx.hash.slice(0, 10)}...\n\n블록체인에서 확인 중입니다...\n잠시만 기다려주세요.`
      );

      // 트랜잭션 확정 대기
      console.log('⏳ 트랜잭션 확정 대기 중...');
      const receipt = await tx.wait();
      
      console.log('✅ 트랜잭션 확정 완료:', receipt);

      alert(
        `✅ 티켓 ${completedTickets.length}장 구매 완료! 🎉\n\n총 비용: ${totalPrice} KAIA\n\n한 번의 트랜잭션으로 완료!\n마이페이지에서 확인하세요!`
      );

      // 홈으로 이동
      router.push('/');
    } catch (error: any) {
      console.error('❌ 티켓 구매 실패:', error);

      let errorMessage = '티켓 구매에 실패했습니다.';

      if (error.code === 'ACTION_REJECTED') {
        errorMessage = '사용자가 트랜잭션을 거부했습니다.';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = '잔액이 부족합니다. KAIA를 충전해주세요.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(`❌ 오류 발생\n\n${errorMessage}`);
    } finally {
      setIsLoading(false);
      setPurchaseCount(0);
      setTotalCount(0);
    }
  };

  // 번호 색상 (로또 스타일)
  const getNumberColor = (num: number) => {
    if (num <= 10) return '#FFC107'; // 노란색
    if (num <= 20) return '#2196F3'; // 파란색
    if (num <= 30) return '#F44336'; // 빨간색
    if (num <= 40) return '#9E9E9E'; // 회색
    return '#4CAF50'; // 초록색
  };

  // 지갑 연결되지 않은 경우
  if (!address) {
    return (
      <MobileLayout showBottomNav={false}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: 'clamp(20px, 5vw, 30px)',
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(20px, 5vw, 24px)',
              fontWeight: '700',
              color: 'white',
              marginBottom: 'clamp(15px, 4vw, 20px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            지갑을 먼저 연결해주세요
          </h2>
          <button
            onClick={connectWallet}
            style={{
              padding: 'clamp(12px, 3vw, 15px) clamp(30px, 7vw, 40px)',
              background: 'linear-gradient(135deg, #93EE00 0%, #7BC800 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 'clamp(10px, 3vw, 12px)',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            🦊 지갑 연결
          </button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      {/* 헤더 */}
      <div
        style={{
          background: 'white',
          padding: 'clamp(12px, 3vw, 15px) clamp(15px, 4vw, 20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 'clamp(20px, 5vw, 24px)',
            cursor: 'pointer',
          }}
        >
          ← 
        </button>
        <span
          style={{
            fontSize: 'clamp(16px, 4vw, 18px)',
            fontWeight: '600',
            color: '#333',
            fontFamily: 'SF Pro, Arial, sans-serif',
          }}
        >
          복권 구매
        </span>
        <div style={{ width: 'clamp(20px, 5vw, 24px)' }} /> {/* 빈 공간 (정렬용) */}
      </div>

      {/* 지갑 정보 바 */}
      <div
        style={{
          background: 'linear-gradient(135deg, #6B46C1 0%, #9333EA 100%)',
          padding: 'clamp(10px, 3vw, 12px) clamp(15px, 4vw, 20px)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 'clamp(10px, 2.5vw, 12px)',
              opacity: 0.8,
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            내 지갑
          </div>
          <div
            style={{
              fontSize: 'clamp(12px, 3vw, 14px)',
              fontWeight: '600',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: 'clamp(10px, 2.5vw, 12px)',
              opacity: 0.8,
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            잔액
          </div>
          <div
            style={{
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontWeight: '700',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            {balance} KAIA
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div
        style={{
          flex: 1,
          padding: 'clamp(15px, 4vw, 20px)',
          overflow: 'auto',
        }}
      >
        {/* 세트 개수 및 빠른 추가 */}
        <div
          style={{
            background: 'white',
            borderRadius: 'clamp(15px, 4vw, 20px)',
            padding: 'clamp(15px, 4vw, 20px)',
            marginBottom: 'clamp(15px, 4vw, 20px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'clamp(12px, 3vw, 15px)',
            }}
          >
            <h3
              style={{
                fontSize: 'clamp(16px, 4vw, 18px)',
                fontWeight: '600',
                color: '#333',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              🎫 티켓 {ticketSets.length}장
            </h3>
            <button
              onClick={addSet}
              style={{
                padding: 'clamp(6px, 2vw, 8px) clamp(12px, 3vw, 15px)',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                fontSize: 'clamp(12px, 3vw, 14px)',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              + 1장 추가
            </button>
          </div>

          {/* 자동 선택 버튼 그룹 */}
          <div style={{ display: 'flex', gap: 'clamp(6px, 2vw, 8px)', flexWrap: 'wrap' }}>
            {[5, 10, 20, 50].map((count) => (
              <button
                key={count}
                onClick={() => autoSelectMultiple(count)}
                style={{
                  flex: 1,
                  minWidth: 'clamp(60px, 15vw, 80px)',
                  padding: 'clamp(8px, 2vw, 10px)',
                  background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'clamp(8px, 2vw, 10px)',
                  fontSize: 'clamp(11px, 3vw, 13px)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                🎲 {count}장 자동
              </button>
            ))}
          </div>

          {/* 전체 초기화 */}
          <button
            onClick={clearSelection}
            style={{
              width: '100%',
              marginTop: 'clamp(10px, 3vw, 12px)',
              padding: 'clamp(8px, 2vw, 10px)',
              background: '#F44336',
              color: 'white',
              border: 'none',
              borderRadius: 'clamp(8px, 2vw, 10px)',
              fontSize: 'clamp(12px, 3vw, 14px)',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            🗑️ 전체 초기화
          </button>
        </div>

        {/* 세트 목록 */}
        <div
          style={{
            background: 'white',
            borderRadius: 'clamp(15px, 4vw, 20px)',
            padding: 'clamp(15px, 4vw, 20px)',
            marginBottom: 'clamp(15px, 4vw, 20px)',
            maxHeight: 'clamp(200px, 35vh, 250px)',
            overflow: 'auto',
          }}
        >
          <h3
            style={{
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontWeight: '600',
              color: '#333',
              marginBottom: 'clamp(10px, 3vw, 12px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            티켓 목록
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 2vw, 10px)' }}>
            {ticketSets.map((set) => (
              <div
                key={set.id}
                onClick={() => setCurrentSetId(set.id)}
                style={{
                  padding: 'clamp(10px, 3vw, 12px)',
                  background: currentSetId === set.id ? '#E3F2FD' : '#F9F9F9',
                  border: `2px solid ${currentSetId === set.id ? '#2196F3' : '#E0E0E0'}`,
                  borderRadius: 'clamp(8px, 2vw, 10px)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 'clamp(11px, 3vw, 13px)',
                      color: '#666',
                      marginBottom: 'clamp(4px, 1vw, 5px)',
                      fontFamily: 'SF Pro, Arial, sans-serif',
                    }}
                  >
                    티켓 #{set.id}
                  </div>
                  <div style={{ display: 'flex', gap: 'clamp(4px, 1vw, 5px)', flexWrap: 'wrap' }}>
                    {set.numbers.length > 0 ? (
                      set.numbers.map((num, idx) => (
                        <span
                          key={idx}
                          style={{
                            width: 'clamp(24px, 6vw, 28px)',
                            height: 'clamp(24px, 6vw, 28px)',
                            borderRadius: '50%',
                            background: getNumberColor(num),
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 'clamp(10px, 2.5vw, 12px)',
                            fontWeight: '700',
                            fontFamily: 'SF Pro, Arial, sans-serif',
                          }}
                        >
                          {num}
                        </span>
                      ))
                    ) : (
                      <span
                        style={{
                          fontSize: 'clamp(11px, 3vw, 13px)',
                          color: '#999',
                          fontFamily: 'SF Pro, Arial, sans-serif',
                        }}
                      >
                        번호를 선택해주세요
                      </span>
                    )}
                  </div>
                </div>
                {ticketSets.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSet(set.id);
                    }}
                    style={{
                      width: 'clamp(28px, 7vw, 32px)',
                      height: 'clamp(28px, 7vw, 32px)',
                      background: '#F44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      fontSize: 'clamp(14px, 3.5vw, 16px)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 현재 세트 번호 선택 */}
        <div
          style={{
            background: 'white',
            borderRadius: 'clamp(15px, 4vw, 20px)',
            padding: 'clamp(20px, 5vw, 25px)',
            marginBottom: 'clamp(15px, 4vw, 20px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'clamp(12px, 3vw, 15px)',
            }}
          >
            <h3
              style={{
                fontSize: 'clamp(16px, 4vw, 18px)',
                fontWeight: '600',
                color: '#333',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              티켓 #{currentSetId} ({selectedNumbers.length}/6)
            </h3>
            <button
              onClick={autoSelect}
              style={{
                padding: 'clamp(6px, 2vw, 8px) clamp(12px, 3vw, 15px)',
                background: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                fontSize: 'clamp(12px, 3vw, 14px)',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              🎲 자동
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 'clamp(8px, 2vw, 10px)',
              marginBottom: 'clamp(15px, 4vw, 20px)',
              flexWrap: 'wrap',
            }}
          >
            {Array.from({ length: 6 }).map((_, index) => {
              const num = selectedNumbers[index];
              return (
                <div
                  key={index}
                  style={{
                    width: 'clamp(45px, 11vw, 55px)',
                    height: 'clamp(45px, 11vw, 55px)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'clamp(18px, 5vw, 22px)',
                    fontWeight: '700',
                    fontFamily: 'SF Pro, Arial, sans-serif',
                    background: num ? getNumberColor(num) : '#E0E0E0',
                    color: num ? 'white' : '#9E9E9E',
                    boxShadow: num ? '0 3px 10px rgba(0,0,0,0.2)' : 'none',
                  }}
                >
                  {num || '?'}
                </div>
              );
            })}
          </div>

          {/* 버튼 그룹 */}
          <div
            style={{
              display: 'flex',
              gap: 'clamp(8px, 2vw, 10px)',
            }}
          >
            <button
              onClick={autoSelect}
              style={{
                flex: 1,
                padding: 'clamp(10px, 3vw, 12px)',
                background: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                fontSize: 'clamp(13px, 3.5vw, 15px)',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              🎲 자동 선택
            </button>
            <button
              onClick={clearSelection}
              style={{
                flex: 1,
                padding: 'clamp(10px, 3vw, 12px)',
                background: '#F44336',
                color: 'white',
                border: 'none',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                fontSize: 'clamp(13px, 3.5vw, 15px)',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              🗑️ 초기화
            </button>
          </div>
        </div>

        {/* 번호 선택 그리드 */}
        <div
          style={{
            background: 'white',
            borderRadius: 'clamp(15px, 4vw, 20px)',
            padding: 'clamp(15px, 4vw, 20px)',
            marginBottom: 'clamp(15px, 4vw, 20px)',
          }}
        >
          <h3
            style={{
              fontSize: 'clamp(16px, 4vw, 18px)',
              fontWeight: '600',
              color: '#333',
              marginBottom: 'clamp(12px, 3vw, 15px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            번호를 선택하세요 (1-45)
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(40px, 10vw, 50px), 1fr))',
              gap: 'clamp(6px, 2vw, 8px)',
            }}
          >
            {Array.from({ length: 45 }, (_, i) => i + 1).map((number) => {
              const isSelected = selectedNumbers.includes(number);
              const isDisabled = !isSelected && selectedNumbers.length >= 6;

              return (
                <button
                  key={number}
                  onClick={() => toggleNumber(number)}
                  disabled={isDisabled}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: '50%',
                    border: isSelected ? '3px solid #333' : '1px solid #E0E0E0',
                    background: isSelected ? getNumberColor(number) : 'white',
                    color: isSelected ? 'white' : '#333',
                    fontSize: 'clamp(14px, 3.5vw, 16px)',
                    fontWeight: isSelected ? '700' : '500',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.3 : 1,
                    fontFamily: 'SF Pro, Arial, sans-serif',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 3px 10px rgba(0,0,0,0.2)' : 'none',
                  }}
                >
                  {number}
                </button>
              );
            })}
          </div>
        </div>

        {/* 가격 정보 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #6B46C1 0%, #9333EA 100%)',
            borderRadius: 'clamp(15px, 4vw, 20px)',
            padding: 'clamp(20px, 5vw, 25px)',
            color: 'white',
            marginBottom: 'clamp(15px, 4vw, 20px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'clamp(12px, 3vw, 15px)' }}>
            <div>
              <div
                style={{
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  opacity: 0.8,
                  marginBottom: 'clamp(4px, 1vw, 5px)',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                장당 가격
              </div>
              <div
                style={{
                  fontSize: 'clamp(18px, 4.5vw, 20px)',
                  fontWeight: '700',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                {ticketPrice} KAIA
              </div>
              <div
                style={{
                  fontSize: 'clamp(11px, 3vw, 13px)',
                  opacity: 0.7,
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                ≈ ₩{(parseFloat(ticketPrice) * 1430).toFixed(0)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  opacity: 0.8,
                  marginBottom: 'clamp(4px, 1vw, 5px)',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                총 {ticketSets.length}장
              </div>
              <div
                style={{
                  fontSize: 'clamp(22px, 5.5vw, 26px)',
                  fontWeight: '700',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                {(parseFloat(ticketPrice) * ticketSets.length).toFixed(4)}
              </div>
              <div
                style={{
                  fontSize: 'clamp(11px, 3vw, 13px)',
                  opacity: 0.7,
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                ≈ ₩{((parseFloat(ticketPrice) * ticketSets.length * 1430).toFixed(0))}
              </div>
            </div>
          </div>

          {/* 진행 상태 (구매 중일 때만) */}
          {isLoading && totalCount > 0 && (
            <div
              style={{
                marginTop: 'clamp(12px, 3vw, 15px)',
                paddingTop: 'clamp(12px, 3vw, 15px)',
                borderTop: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              <div
                style={{
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  marginBottom: 'clamp(6px, 2vw, 8px)',
                  textAlign: 'center',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                구매 진행 중... {purchaseCount} / {totalCount}
              </div>
              <div
                style={{
                  width: '100%',
                  height: 'clamp(6px, 2vw, 8px)',
                  background: 'rgba(255,255,255,0.3)',
                  borderRadius: 'clamp(3px, 1vw, 4px)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${(purchaseCount / totalCount) * 100}%`,
                    height: '100%',
                    background: '#93EE00',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 구매 버튼 */}
        <button
          onClick={handleBuy}
          disabled={ticketSets.filter((set) => set.numbers.length === 6).length === 0 || isLoading}
          style={{
            width: '100%',
            padding: 'clamp(15px, 4vw, 18px)',
            background:
              ticketSets.filter((set) => set.numbers.length === 6).length > 0 && !isLoading
                ? 'linear-gradient(135deg, #93EE00 0%, #7BC800 100%)'
                : '#E0E0E0',
            color: ticketSets.filter((set) => set.numbers.length === 6).length > 0 && !isLoading ? 'white' : '#9E9E9E',
            border: 'none',
            borderRadius: 'clamp(12px, 3vw, 15px)',
            fontSize: 'clamp(16px, 4vw, 18px)',
            fontWeight: '700',
            cursor: ticketSets.filter((set) => set.numbers.length === 6).length > 0 && !isLoading ? 'pointer' : 'not-allowed',
            fontFamily: 'SF Pro, Arial, sans-serif',
            boxShadow:
              ticketSets.filter((set) => set.numbers.length === 6).length > 0 && !isLoading
                ? '0 6px 20px rgba(147, 238, 0, 0.4)'
                : 'none',
            transition: 'all 0.3s ease',
            marginBottom: 'clamp(80px, 15vh, 100px)',
          }}
        >
          {isLoading
            ? `⏳ 구매 중... (${purchaseCount}/${totalCount})`
            : (() => {
                const completed = ticketSets.filter((set) => set.numbers.length === 6).length;
                const total = ticketSets.length;
                if (completed === 0) {
                  return '번호를 선택해주세요';
                } else if (completed === total) {
                  return `🎫 ${completed}장 구매하기 (${(parseFloat(ticketPrice) * completed).toFixed(4)} KAIA)`;
                } else {
                  return `🎫 완성된 ${completed}장 구매 (${(parseFloat(ticketPrice) * completed).toFixed(4)} KAIA)`;
                }
              })()}
        </button>
      </div>
    </MobileLayout>
  );
}

