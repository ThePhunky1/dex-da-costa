// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.30;
// Local Anvil fixture only; not a production token deployment.
contract MockPURR {
 string public constant name="Mock PURR";
 string public constant symbol="PURR";
 uint8 public constant decimals=18;
 uint256 public totalSupply;
 mapping(address=>uint256) public balanceOf;
 mapping(address=>mapping(address=>uint256)) public allowance;
 function mint(address to,uint256 value) external {balanceOf[to]+=value;totalSupply+=value;}
 function approve(address to,uint256 value) external returns(bool){allowance[msg.sender][to]=value;return true;}
 function transfer(address to,uint256 value) external returns(bool){balanceOf[msg.sender]-=value;balanceOf[to]+=value;return true;}
 function transferFrom(address from,address to,uint256 value) external returns(bool){if(allowance[from][msg.sender]!=type(uint256).max)allowance[from][msg.sender]-=value;balanceOf[from]-=value;balanceOf[to]+=value;return true;}
}
