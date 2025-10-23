// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/Lotto.sol";

contract QuickSetupDraw is Script {
    function run() external {
        address lottoAddress = 0xc9774038D89a129D9f740DE17b541980d25dD1cE;
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        Lotto lotto = Lotto(lottoAddress);
        
        console.log("=== Quick Draw Setup ===");
        console.log("Current Draw ID (before):", lotto.currentDrawId());
        
        // 1주일 후 추첨
        uint256 drawTimestamp = block.timestamp + 7 days;
        
        // 회차 1 생성 (판매 열림)
        lotto.createOrUpdateDraw(1, drawTimestamp, true);
        console.log("Created Draw #1");
        
        // 현재 판매 회차를 1번으로 설정
        lotto.setCurrentDraw(1);
        console.log("Set current draw to #1");
        
        console.log("Current Draw ID (after):", lotto.currentDrawId());
        
        // 확인
        (uint256 timestamp, bool isOpen) = lotto.draws(1);
        console.log("Draw #1 Timestamp:", timestamp);
        console.log("Draw #1 Is Open:", isOpen);
        
        vm.stopBroadcast();
        
        console.log("\nDone! You can now buy tickets!");
    }
}

