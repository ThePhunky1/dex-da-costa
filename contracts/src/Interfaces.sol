// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.30;

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function approve(address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
}
interface IWrapped is IERC20 {
    function deposit() external payable;
    function withdraw(uint256) external;
}
interface IFactory {
    function createPair(address, address) external returns (address);
    function getPair(address, address) external view returns (address);
    function feeTo() external view returns (address);
    function feeToSetter() external view returns (address);
}
interface IPair is IERC20 {
    function token0() external view returns (address);
    function getReserves() external view returns (uint112, uint112, uint32);
    function swap(uint256, uint256, address, bytes calldata) external;
    function mint(address) external returns (uint256);
    function sync() external;
}
interface IRouter {
    function factory() external view returns (address);
    function WETH() external view returns (address);
    function addLiquidityETH(address,uint256,uint256,uint256,address,uint256) external payable returns(uint256,uint256,uint256);
    function removeLiquidityETH(address,uint256,uint256,uint256,address,uint256) external returns(uint256,uint256);
    function swapExactETHForTokens(uint256,address[] calldata,address,uint256) external payable returns(uint256[] memory);
    function swapExactTokensForETH(uint256,uint256,address[] calldata,address,uint256) external returns(uint256[] memory);
    function getAmountsOut(uint256,address[] calldata) external view returns(uint256[] memory);
}
interface Vm {
    function getCode(string calldata) external returns(bytes memory);
    function deal(address,uint256) external;
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function expectRevert() external;
    function expectRevert(bytes calldata) external;
    function warp(uint256) external;
    function envAddress(string calldata) external returns(address);
    function envBool(string calldata) external returns(bool);
    function startBroadcast(address) external;
    function stopBroadcast() external;
    function chainId(uint256) external;
    function etch(address,bytes calldata) external;
    function setEnv(string calldata,string calldata) external;
}
