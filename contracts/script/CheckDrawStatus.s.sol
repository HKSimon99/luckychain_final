// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/Lotto.sol";

contract CheckDrawStatus is Script {
    function run() external view {
        address lottoAddress = 0xc9774038D89a129D9f740DE17b541980d25dD1cE;
        Lotto lotto = Lotto(lottoAddress);
        
        console.log("=== Lotto Contract Status ===");
        console.log("Contract Address:", lottoAddress);
        console.log("");
        
        // Current Draw ID
        uint256 currentDrawId = lotto.currentDrawId();
        console.log("Current Draw ID:", currentDrawId);
        
        // Draw Info
        (uint256 drawTimestamp, bool isOpenForSale) = lotto.draws(currentDrawId);
        console.log("Draw Timestamp:", drawTimestamp);
        console.log("Is Open For Sale:", isOpenForSale);
        
        // Other Info
        uint256 ticketPrice = lotto.ticketPrice();
        uint256 prizePool = lotto.prizePool(currentDrawId);
        uint256 jackpot = lotto.accumulatedJackpot();
        address owner = lotto.owner();
        
        console.log("");
        console.log("Ticket Price:", ticketPrice);
        console.log("Prize Pool:", prizePool);
        console.log("Accumulated Jackpot:", jackpot);
        console.log("Owner:", owner);
    }
}

