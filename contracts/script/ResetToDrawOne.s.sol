// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/Lotto.sol";

contract ResetToDrawOne is Script {
    function run() external {
        address lottoAddress = 0x87D9Bad208544Ff94dBBa58e6b70eF40AaB92aB4;
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        Lotto lotto = Lotto(lottoAddress);
        
        console.log("=== Resetting Draw System ===");
        console.log("Current Draw ID (before):", lotto.currentDrawId());
        
        // 1주일 후 추첨
        uint256 drawTimestamp = block.timestamp + 7 days;
        
        // 회차를 1로 리셋 (판매 열림)
        lotto.resetDrawSystem(1, drawTimestamp);
        console.log("Reset to Draw #1");
        
        console.log("Current Draw ID (after):", lotto.currentDrawId());
        
        // 확인
        (uint256 timestamp, bool isOpen) = lotto.draws(1);
        console.log("Draw #1 Timestamp:", timestamp);
        console.log("Draw #1 Is Open:", isOpen);
        
        vm.stopBroadcast();
        
        console.log("\nDone! Draw system reset to #1!");
    }
}

