/**
 * KAIA 가격 API 테스트 스크립트
 * 
 * 실행 방법:
 * node scripts/test-kaia-price.js
 */

async function testUpbitAPI() {
  console.log('\n🔍 Upbit API 테스트...');
  try {
    const response = await fetch('https://api.upbit.com/v1/ticker?markets=KRW-KAIA');
    const data = await response.json();
    
    if (data && data[0]) {
      console.log('✅ Upbit API 성공!');
      console.log('   시장:', data[0].market);
      console.log('   현재가:', data[0].trade_price.toLocaleString('ko-KR'), 'KRW');
      console.log('   변동률:', (data[0].change_rate * 100).toFixed(2) + '%');
      console.log('   변동:', data[0].change === 'RISE' ? '상승 📈' : data[0].change === 'FALL' ? '하락 📉' : '보합');
      return data[0].trade_price;
    } else {
      throw new Error('No data received');
    }
  } catch (error) {
    console.error('❌ Upbit API 실패:', error.message);
    return null;
  }
}

async function testCoinGeckoAPI() {
  console.log('\n🔍 CoinGecko API 테스트...');
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=kaia&vs_currencies=krw'
    );
    const data = await response.json();
    
    if (data && data.kaia && data.kaia.krw) {
      console.log('✅ CoinGecko API 성공!');
      console.log('   현재가:', data.kaia.krw.toLocaleString('ko-KR'), 'KRW');
      return data.kaia.krw;
    } else {
      throw new Error('No data received');
    }
  } catch (error) {
    console.error('❌ CoinGecko API 실패:', error.message);
    return null;
  }
}

async function comparePrices(upbitPrice, coingeckoPrice) {
  if (!upbitPrice || !coingeckoPrice) {
    console.log('\n⚠️  가격 비교 불가 (API 실패)');
    return;
  }

  console.log('\n📊 가격 비교:');
  console.log('   Upbit:     ₩' + upbitPrice.toLocaleString('ko-KR'));
  console.log('   CoinGecko: ₩' + coingeckoPrice.toLocaleString('ko-KR'));
  
  const diff = upbitPrice - coingeckoPrice;
  const diffPercent = ((diff / upbitPrice) * 100).toFixed(2);
  
  console.log('   차이:      ₩' + Math.abs(diff).toLocaleString('ko-KR') + ' (' + diffPercent + '%)');
  
  if (Math.abs(parseFloat(diffPercent)) < 1) {
    console.log('   ✅ 가격 차이가 1% 미만입니다 (정상)');
  } else {
    console.log('   ⚠️  가격 차이가 1% 이상입니다');
  }
}

async function testConversion() {
  console.log('\n💰 KAIA → KRW 환산 테스트...');
  
  const upbitPrice = await testUpbitAPI();
  
  if (upbitPrice) {
    const testAmounts = [1, 10, 100, 1000];
    console.log('\n환산 결과:');
    testAmounts.forEach(amount => {
      const krw = (amount * upbitPrice).toLocaleString('ko-KR');
      console.log(`   ${amount} KAIA = ₩${krw}`);
    });
  }
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('🔥 KAIA 가격 API 테스트 시작');
  console.log('═══════════════════════════════════════');

  const upbitPrice = await testUpbitAPI();
  const coingeckoPrice = await testCoinGeckoAPI();
  
  await comparePrices(upbitPrice, coingeckoPrice);
  await testConversion();

  console.log('\n═══════════════════════════════════════');
  console.log('✅ 테스트 완료!');
  console.log('═══════════════════════════════════════\n');
}

main().catch(error => {
  console.error('❌ 테스트 실패:', error);
  process.exit(1);
});

