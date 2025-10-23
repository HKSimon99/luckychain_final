'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import MobileLayout from '@/components/MobileLayout';

export default function AgreementPage() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [checkedList, setCheckedList] = useState([false, false, false, false]);
  const [allChecked, setAllChecked] = useState(false);

  const toggleOpen = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleCheck = (index: number) => {
    const newCheckedList = [...checkedList];
    newCheckedList[index] = !newCheckedList[index];
    setCheckedList(newCheckedList);

    const allSelected = newCheckedList.every(Boolean);
    setAllChecked(allSelected);
  };

  const handleAllCheck = () => {
    const newAll = !allChecked;
    setAllChecked(newAll);
    setCheckedList(checkedList.map(() => newAll));
  };

  const handleSubmit = () => {
    if (allChecked) {
      localStorage.setItem('agreementCompleted', 'true');
      router.push('/wallet');
    }
  };

  const terms = [
    {
      title: '서비스 이용약관 (필수)',
      desc: 'Luckychain 서비스 이용에 관한 기본 약관',
      content: `제1조 (목적)
본 약관은 Luckychain(이하 "회사")이 제공하는 탈중앙화 복권 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 회사가 제공하는 블록체인 기반 복권 플랫폼을 의미합니다.
2. "이용자"란 본 약관에 동의하고 서비스를 이용하는 자를 말합니다.`,
    },
    {
      title: '개인정보 처리방침 (필수)',
      desc: '개인정보 수집 및 이용에 관한 사항',
      content: `제1조 (개인정보의 수집 및 이용 목적)
회사는 다음의 목적을 위하여 최소한의 개인정보를 수집하고 이용합니다:
1. 서비스 제공 및 계약 이행
2. 회원 관리 및 본인 확인
3. 불법 이용 방지 및 분쟁 해결
4. 공지사항 전달 및 고객 상담

제2조 (수집하는 개인정보의 항목)
1. 지갑 주소 (필수)
2. 거래 기록 (자동 수집)
3. 서비스 이용 기록 (자동 수집)

제3조 (개인정보의 보유 및 이용 기간)
1. 회사는 법령에 따른 보존 의무가 있는 경우를 제외하고는 서비스 종료 시 즉시 파기합니다.
2. 블록체인에 기록된 거래 내역은 블록체인의 특성상 영구 보존됩니다.

제4조 (개인정보의 제3자 제공)
회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.`,
    },
    {
      title: '만 19세 이상 확인 (필수)',
      desc: '성인 인증 및 법적 책임에 관한 사항',
      content: `본인은 만 19세 이상의 성인임을 확인합니다.

1. 미성년자 이용 금지
본 서비스는 도박 관련 콘텐츠를 포함하고 있어 만 19세 미만의 미성년자는 이용할 수 없습니다.

2. 법적 책임
만 19세 미만임에도 허위로 성인 인증을 한 경우, 관련 법령에 따라 처벌받을 수 있으며 모든 법적 책임은 본인에게 있습니다.

3. 지역 법규 준수
본인은 거주 국가 및 지역의 법률에 따라 본 서비스 이용이 합법적임을 확인했습니다.`,
    },
    {
      title: '투자 위험 고지 (필수)',
      desc: '암호화폐 및 복권 참여의 위험성 안내',
      content: `본인은 다음의 위험을 충분히 인지하고 동의합니다:

1. 암호화폐 가격 변동성
암호화폐는 가격 변동성이 존재하며, 투자 원금의 전부 또는 일부를 잃을 수 있습니다.

2. 복권의 특성
복권은 확률 게임이며, 당첨을 보장하지 않습니다. 투자한 금액을 회수하지 못할 수 있습니다.

3. 스마트 컨트랙트 위험
스마트 컨트랙트는 코드로 작성되어 있으며, 예상치 못한 버그나 해킹의 위험이 존재할 수 있습니다.

4. 블록체인 거래의 비가역성
블록체인상의 거래는 되돌릴 수 없습니다. 한번 전송된 자산은 회수가 불가능합니다.

5. 규제 변경 위험
암호화폐 및 복권 관련 법규는 변경될 수 있으며, 이로 인해 서비스 이용이 제한될 수 있습니다.

6. 책임의 한계
회사는 위의 위험으로 인한 손실에 대해 책임지지 않습니다.

본인은 위의 모든 위험을 충분히 이해했으며, 본인의 자유로운 의사에 따라 서비스를 이용합니다.`,
    },
  ];

  return (
    <MobileLayout showBottomNav={false}>
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          background: '#380D44',
          padding: 'clamp(40px, 8vh, 60px) clamp(15px, 4vw, 20px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '400px',
            background: 'linear-gradient(292deg, #6E0058 6.55%, #450058 65.52%)',
            borderRadius: 'clamp(15px, 4vw, 20px)',
            padding: 'clamp(25px, 6vw, 35px) clamp(15px, 4vw, 20px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'clamp(12px, 3vw, 15px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
          }}
        >
          {/* 로고 */}
          <div style={{ width: 'clamp(80px, 20vw, 100px)', height: 'clamp(80px, 20vw, 100px)', position: 'relative', marginBottom: '-10px' }}>
            <Image
              src="/logo.png"
              alt="Luckychain Logo"
              width={100}
              height={100}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              priority
            />
          </div>

          {/* 타이틀 */}
          <div style={{ color: '#ffffff', fontSize: 'clamp(22px, 6vw, 28px)', fontWeight: '700', fontFamily: 'SF Pro, Arial, sans-serif' }}>
            Luckychain
          </div>

          {/* 부제목 */}
          <div style={{ color: '#ffffff', fontSize: 'clamp(13px, 3.5vw, 15px)', fontWeight: '500', marginTop: '2px', fontFamily: 'SF Pro, Arial, sans-serif' }}>
            서비스 이용 동의
          </div>

          {/* 안내 문구 */}
          <div
            style={{
              color: '#D9D9D9',
              fontSize: 'clamp(9px, 2.5vw, 10px)',
              textAlign: 'center',
              lineHeight: '1.5',
              fontWeight: '300',
              marginTop: '-8px',
              marginBottom: 'clamp(15px, 4vw, 20px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            서비스 이용을 위해 아래 약관에 동의해주세요
          </div>

          {/* 전체 동의 박스 */}
          <div
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.17)',
              borderRadius: 'clamp(8px, 2vw, 10px)',
              border: '1px solid #B18EBA',
              padding: 'clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 15px)',
              cursor: 'pointer',
              marginBottom: 'clamp(8px, 2vw, 10px)',
            }}
            onClick={handleAllCheck}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 10px)' }}>
              <div
                style={{
                  width: 'clamp(12px, 3vw, 14px)',
                  height: 'clamp(12px, 3vw, 14px)',
                  borderRadius: '4px',
                  border: '1px solid #D3D3D3',
                  background: allChecked ? '#74b464' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#14650b',
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  lineHeight: '0',
                }}
              >
                {allChecked && '✔'}
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: 'clamp(11px, 3vw, 12px)', fontWeight: '500', fontFamily: 'SF Pro, Arial, sans-serif' }}>
                  전체 동의
                </div>
                <div style={{ color: '#CAC4C4', fontSize: 'clamp(7.5px, 2vw, 8px)', fontWeight: '300', marginTop: '2px', fontFamily: 'SF Pro, Arial, sans-serif' }}>
                  모든 약관에 동의합니다
                </div>
              </div>
            </div>
          </div>

          {/* 약관 목록 */}
          {terms.map((item, index) => (
            <div
              key={index}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.17)',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                border: '1px solid #B18EBA',
                padding: 'clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 15px) clamp(22px, 5vw, 28px)',
                position: 'relative',
                marginBottom: 'clamp(8px, 2vw, 10px)',
                minHeight: 'clamp(70px, 18vw, 85px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'clamp(8px, 2vw, 10px)' }}>
                <div
                  onClick={() => handleCheck(index)}
                  style={{
                    width: 'clamp(12px, 3vw, 14px)',
                    height: 'clamp(12px, 3vw, 14px)',
                    borderRadius: '4px',
                    border: '1px solid #D3D3D3',
                    marginTop: '3px',
                    background: checkedList[index] ? '#74b464' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#14650b',
                    fontSize: 'clamp(14px, 3.5vw, 16px)',
                    lineHeight: '0',
                  }}
                >
                  {checkedList[index] && '✔'}
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: 'clamp(10px, 2.8vw, 11px)', fontWeight: '500', fontFamily: 'SF Pro, Arial, sans-serif' }}>
                    {item.title}
                  </div>
                  <div style={{ color: '#CAC4C4', fontSize: 'clamp(7.5px, 2vw, 8px)', marginTop: '2px', fontWeight: '300', fontFamily: 'SF Pro, Arial, sans-serif' }}>
                    {item.desc}
                  </div>
                </div>
              </div>

              {/* 내용보기 버튼 */}
              <div
                onClick={() => toggleOpen(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  position: 'absolute',
                  left: '50%',
                  bottom: 'clamp(2px, 0.5vw, 3px)',
                  transform: 'translateX(-50%)',
                  color: '#D89EDC',
                  border: 'none',
                  fontSize: 'clamp(8px, 2vw, 9px)',
                  cursor: 'pointer',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                  fontWeight: '500',
                }}
              >
                <span>{openIndex === index ? '닫기' : '내용 보기'}</span>
                <span style={{ transform: openIndex === index ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', display: 'inline-block' }}>
                  ▼
                </span>
              </div>

              {/* 펼쳐지는 영역 */}
              {openIndex === index && (
                <div
                  style={{
                    marginTop: 'clamp(8px, 2vw, 10px)',
                    paddingTop: 'clamp(8px, 2vw, 10px)',
                    borderTop: '1px solid rgba(255,255,255,0.3)',
                    color: '#fff',
                    fontSize: 'clamp(8px, 2vw, 9px)',
                    lineHeight: '1.8',
                    whiteSpace: 'pre-line',
                    fontWeight: '300',
                    fontFamily: 'SF Pro, Arial, sans-serif',
                  }}
                >
                  {item.content}
                </div>
              )}
            </div>
          ))}

          {/* 중요 안내사항 */}
          <div
            style={{
              width: '100%',
              background: 'rgba(114, 98, 36, 0.25)',
              borderRadius: 'clamp(8px, 2vw, 10px)',
              border: '1px solid #9A7600',
              padding: 'clamp(12px, 3vw, 15px)',
              color: '#FFD016',
              fontSize: 'clamp(7.5px, 2vw, 8px)',
              lineHeight: '1.8',
              marginTop: 'clamp(4px, 1vw, 5px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: 'clamp(10px, 2.8vw, 11px)',
                fontWeight: '500',
                marginBottom: 'clamp(6px, 1.5vw, 7px)',
                gap: '5px',
              }}
            >
              ⚠️ 중요 안내사항
            </div>
            <div style={{ marginBottom: 'clamp(5px, 1.2vw, 6px)', fontWeight: '300' }}>- 블록체인 거래는 되돌릴 수 없습니다.</div>
            <div style={{ marginBottom: 'clamp(5px, 1.2vw, 6px)', fontWeight: '300' }}>- 개인키 분실 시 자산을 복구할 수 없습니다.</div>
            <div style={{ fontWeight: '300' }}>- 투자 원금 손실 가능성이 있습니다.</div>
          </div>

          {/* 동의 버튼 */}
          <div
            onClick={handleSubmit}
            style={{
              width: '100%',
              borderRadius: 'clamp(8px, 2vw, 10px)',
              textAlign: 'center',
              fontSize: 'clamp(12px, 3vw, 14px)',
              padding: 'clamp(10px, 2.5vw, 12px) 0',
              marginTop: 'clamp(8px, 2vw, 10px)',
              cursor: allChecked ? 'pointer' : 'default',
              background: allChecked ? '#7ecb02' : 'rgba(92, 62, 101, 0.61)',
              color: allChecked ? '#fff' : '#7A5F79',
              fontWeight: '500',
              transition: 'all 0.3s ease',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            {allChecked ? '가입하기' : '모든 약관에 동의해주세요'}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}

