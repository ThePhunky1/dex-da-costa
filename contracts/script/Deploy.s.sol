// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.30;
import {Vm, IERC20, IFactory, IRouter} from "../src/Interfaces.sol";

/// @notice Dry-run by default; --broadcast is an explicit operator action.
/// Uses a Foundry encrypted keystore / hardware wallet, never a key in a source file.
contract Deploy {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant USDC = 0x7D29d8047B905000459c0E80c34a26CeedcB47b2;
    event Deployment(address wrapper, address factory, address router, address pair, address usdc);
    function run() external returns(address wrapper,address factory,address router,address pair) {
        require(block.chainid == 99801, "Elysium testnet only");
        require(vm.envBool("CONFIRM_TESTNET_ASSETS"), "Review verified asset report first");
        require(USDC.code.length > 0 && IERC20(USDC).decimals() == 6, "USDC unavailable");
        (bool ok, bytes memory data) = USDC.staticcall(abi.encodeWithSignature("l1Address()"));
        require(ok && abi.decode(data,(address)) == 0x2B3370eE501B4a559b57D449569354196457D8Ab, "USDC provenance");
        address sender = vm.envAddress("DEPLOYER");
        vm.startBroadcast(sender);
        wrapper = deploy("artifacts/WETH9.json", "");
        // No admin: protocol fee permanently disabled. All 0.30% goes to LPs.
        factory = deploy("artifacts/UniswapV2Factory.json", abi.encode(address(0)));
        router = deploy("artifacts/UniswapV2Router02.json", abi.encode(factory, wrapper));
        pair = IFactory(factory).createPair(wrapper, USDC);
        vm.stopBroadcast();
        require(IRouter(router).WETH() == wrapper && IRouter(router).factory() == factory, "Bad wiring");
        emit Deployment(wrapper,factory,router,pair,USDC);
    }
    function deploy(string memory artifact, bytes memory args) internal returns(address instance) {
        bytes memory code = abi.encodePacked(vm.getCode(artifact),args);
        assembly { instance := create(0,add(code,32),mload(code)) }
        require(instance != address(0), "Deployment failed");
    }
}
