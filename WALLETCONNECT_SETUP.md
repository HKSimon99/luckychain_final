# 🔗 WalletConnect 구현 가이드

## ✅ 완료된 작업

WalletConnect v2 (Web3Modal)를 사용하여 다중 지갑 연결 기능이 구현되었습니다!

### 📦 설치된 패키지
- `@web3modal/wagmi` - Web3Modal UI
- `wagmi` - 지갑 연결 라이브러리
- `viem` - Ethereum 인터페이스
- `@tanstack/react-query` - 상태 관리

---

## 🔑 필수: WalletConnect Project ID 발급

### 1단계: WalletConnect Cloud 가입

1. **https://cloud.walletconnect.com** 접속
2. **Sign Up** 또는 GitHub 계정으로 로그인
3. 무료 계정 생성

### 2단계: 프로젝트 생성

1. Dashboard에서 **"Create New Project"** 클릭
2. 프로젝트 정보 입력:
   ```
   Name: Luckychain
   Homepage URL: https://luckychain.vercel.app
   (또는 배포될 실제 URL)
   ```
3. **Create** 클릭

### 3단계: Project ID 복사

1. 생성된 프로젝트 클릭
2. **Project ID** 복사 (예: `a1b2c3d4e5f6g7h8i9j0...`)
3. 이 ID를 안전하게 보관

**중요:** Project ID는 무료이며, 공개되어도 안전합니다 (클라이언트 사이드에서 사용).

---

## ⚙️ 환경 변수 설정

### 로컬 개발 (.env.local)

`frontend/.env.local` 파일을 생성하고 다음 내용 추가:

```env
# WalletConnect Project ID (필수!)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=여기에_발급받은_Project_ID_입력

# 기타 설정
NEXT_PUBLIC_RPC_URL=https://public-en-kairos.node.kaia.io
NEXT_PUBLIC_CHAIN_ID=1001
NEXT_PUBLIC_CONTRACT_ADDRESS=0x1D8E07AE314204F97611e1469Ee81c64b80b47F1
```

### Vercel 배포 환경 변수

1. **Vercel Dashboard** → 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 다음 변수 추가:
   ```
   Name: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
   Value: 발급받은_Project_ID
   ```
4. **Production, Preview, Development** 모두 체크
5. **Save** 클릭

---

## 🚀 사용 방법

### 기본 사용 (이미 구현됨)

지갑 연결 페이지(`/wallet`)에서:
1. "🔗 지갑 연결하기" 버튼 클릭
2. Web3Modal이 자동으로 열림
3. 원하는 지갑 선택:
   - **MetaMask** (브라우저 확장)
   - **WalletConnect** (모바일 지갑 QR 코드)
   - **Coinbase Wallet**
   - **Trust Wallet**
   - 기타 지원 지갑들

### 지원 지갑 목록

- ✅ **MetaMask** (Desktop & Mobile)
- ✅ **Trust Wallet** (Mobile)
- ✅ **Rainbow** (Mobile)
- ✅ **Coinbase Wallet**
- ✅ **Ledger** (Hardware Wallet)
- ✅ **Phantom**
- ✅ 300+ 기타 지갑

---

## 📱 모바일 지갑 연결 방법

### 사용자 경험:

1. **데스크톱에서:**
   - "지갑 연결하기" 클릭
   - QR 코드 표시
   - 모바일 지갑 앱에서 QR 스캔
   - 자동 연결!

2. **모바일에서:**
   - "지갑 연결하기" 클릭
   - 지갑 목록 표시
   - 원하는 지갑 선택
   - 앱 자동 실행 → 승인

---

## 🎨 UI 커스터마이징

`src/config/walletconnect.ts`에서 테마 수정:

```typescript
createWeb3Modal({
  wagmiConfig: config,
  projectId,
  themeMode: 'dark',  // 'light' 또는 'dark'
  themeVariables: {
    '--w3m-accent': '#93EE00',  // 메인 색상
    '--w3m-border-radius-master': '8px',  // 둥근 모서리
  },
});
```

---

## 🔧 고급 사용법

### 다른 페이지에서 지갑 정보 사용

```typescript
'use client';

import { useAccount, useDisconnect } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';

export default function MyComponent() {
  const { address, isConnected } = useAccount();
  const { open } = useWeb3Modal();
  const { disconnect } = useDisconnect();

  return (
    <div>
      {isConnected ? (
        <>
          <p>주소: {address}</p>
          <button onClick={() => disconnect()}>
            연결 해제
          </button>
        </>
      ) : (
        <button onClick={() => open()}>
          지갑 연결
        </button>
      )}
    </div>
  );
}
```

### 트랜잭션 전송

```typescript
import { useWriteContract } from 'wagmi';
import { ethers } from 'ethers';

export default function SendTransaction() {
  const { writeContract } = useWriteContract();

  const buyTicket = async () => {
    await writeContract({
      address: '0x1D8E07AE314204F97611e1469Ee81c64b80b47F1',
      abi: lottoAbi,
      functionName: 'buyTicket',
      args: [numbers],
      value: ethers.parseEther('10'), // 10 KAIA
    });
  };

  return <button onClick={buyTicket}>티켓 구매</button>;
}
```

---

## 🔍 디버깅

### Project ID가 설정되지 않았을 때

브라우저 콘솔에 다음 경고가 표시됩니다:
```
⚠️  WalletConnect Project ID가 설정되지 않았습니다.
   https://cloud.walletconnect.com 에서 Project ID를 발급받으세요.
```

**해결 방법:**
1. `.env.local` 파일에 Project ID 추가
2. 개발 서버 재시작 (`npm run dev`)

### 네트워크 전환 문제

WalletConnect는 자동으로 Kaia Kairos (chainId: 1001)로 전환을 시도합니다.
만약 실패하면 사용자에게 수동 전환을 요청합니다.

---

## 📊 WalletConnect vs 기존 MetaMask 직접 연결

| 기능 | MetaMask 직접 | WalletConnect |
|------|--------------|---------------|
| MetaMask 지원 | ✅ | ✅ |
| 모바일 지갑 | ❌ | ✅ |
| 다중 지갑 | ❌ | ✅ (300+) |
| QR 코드 연결 | ❌ | ✅ |
| UI 제공 | ❌ (직접 구현) | ✅ (자동) |
| 설정 복잡도 | 낮음 | 중간 |
| 사용자 경험 | 보통 | 우수 |

---

## 💡 추천 사항

### 프로덕션 배포 전:

1. ✅ Project ID 발급 완료
2. ✅ Vercel 환경 변수 설정
3. ✅ 다양한 지갑으로 테스트
4. ✅ 모바일 환경 테스트 (QR 코드)
5. ✅ 네트워크 전환 테스트

### 보안 체크리스트:

- ✅ Project ID는 public (안전)
- ✅ Private Key는 **절대** 코드에 포함 금지
- ✅ .env.local은 .gitignore에 포함
- ✅ 사용자 서명 요청 전 확인 메시지 표시

---

## 🔗 유용한 링크

- **WalletConnect Cloud:** https://cloud.walletconnect.com
- **Web3Modal 문서:** https://docs.walletconnect.com/web3modal/about
- **Wagmi 문서:** https://wagmi.sh
- **지원 지갑 목록:** https://walletconnect.com/explorer

---

## 🆘 문제 해결

### 문제 1: "Project ID가 없습니다" 오류
**해결:** `.env.local`에 `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` 추가 후 서버 재시작

### 문제 2: 모달이 열리지 않음
**해결:** 브라우저 콘솔 확인, Provider가 layout.tsx에 제대로 감싸져 있는지 확인

### 문제 3: 네트워크 전환 실패
**해결:** 지갑에서 수동으로 Kaia Kairos 네트워크 추가

---

## 📝 변경된 파일 목록

```
frontend/
  ├── src/
  │   ├── config/
  │   │   └── walletconnect.ts         (새로 생성)
  │   ├── components/
  │   │   └── Providers.tsx             (새로 생성)
  │   ├── app/
  │   │   ├── layout.tsx                (수정)
  │   │   └── wallet/page.tsx           (완전 재작성)
  ├── env.example                        (업데이트)
  └── package.json                       (패키지 추가)
```

---

## ✨ 다음 단계

1. **Project ID 발급** (5분)
2. **환경 변수 설정** (2분)
3. **로컬 테스트** (10분)
4. **Vercel 환경 변수 설정** (3분)
5. **배포 및 최종 테스트** (5분)

**총 소요 시간: 약 25분** ⏱️

---

## 🎉 완료!

WalletConnect 구현이 모두 완료되었습니다!

이제 사용자들은:
- ✅ MetaMask (Desktop/Mobile)
- ✅ Trust Wallet
- ✅ Coinbase Wallet
- ✅ 기타 300+ 지갑

으로 Luckychain에 연결할 수 있습니다! 🚀

