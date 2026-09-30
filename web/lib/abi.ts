import { parseAbi } from 'viem';
export const routerAbi = parseAbi([
 'function factory() view returns (address)', 'function WETH() view returns (address)',
 'function swapExactETHForTokens(uint256 amountOutMin,address[] path,address to,uint256 deadline) payable returns(uint256[] amounts)',
 'function swapExactTokensForETH(uint256 amountIn,uint256 amountOutMin,address[] path,address to,uint256 deadline) returns(uint256[] amounts)',
 'function swapExactTokensForTokens(uint256 amountIn,uint256 amountOutMin,address[] path,address to,uint256 deadline) returns(uint256[] amounts)',
 'function addLiquidity(address tokenA,address tokenB,uint256 amountADesired,uint256 amountBDesired,uint256 amountAMin,uint256 amountBMin,address to,uint256 deadline) returns(uint256 amountA,uint256 amountB,uint256 liquidity)',
 'function removeLiquidity(address tokenA,address tokenB,uint256 liquidity,uint256 amountAMin,uint256 amountBMin,address to,uint256 deadline) returns(uint256 amountA,uint256 amountB)',
 'function addLiquidityETH(address token,uint256 amountTokenDesired,uint256 amountTokenMin,uint256 amountETHMin,address to,uint256 deadline) payable returns(uint256 amountToken,uint256 amountETH,uint256 liquidity)',
 'function removeLiquidityETH(address token,uint256 liquidity,uint256 amountTokenMin,uint256 amountETHMin,address to,uint256 deadline) returns(uint256 amountToken,uint256 amountETH)',
]);
export const factoryAbi=parseAbi(['function getPair(address,address) view returns(address)']);
export const pairAbi=parseAbi(['function token0() view returns(address)','function token1() view returns(address)','function getReserves() view returns(uint112,uint112,uint32)','function totalSupply() view returns(uint256)']);
