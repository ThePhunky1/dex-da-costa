// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.30;
import {Deploy} from "../script/Deploy.s.sol";
import {Vm,IFactory,IRouter,IPair} from "../src/Interfaces.sol";
contract ProvenanceStub {
    function decimals() external pure returns(uint8){return 6;}
    function l1Address() external pure returns(address){return 0x2B3370eE501B4a559b57D449569354196457D8Ab;}
}
contract DeployTest {
    Vm constant vm=Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant USDC=0x7D29d8047B905000459c0E80c34a26CeedcB47b2;
    function testRejectWrongNetwork() public {
        Deploy script=new Deploy();vm.chainId(1);vm.expectRevert(bytes("Elysium testnet only"));script.run();
    }
    function testRejectMissingToken() public {
        Deploy script=new Deploy();vm.chainId(99801);vm.setEnv("CONFIRM_TESTNET_ASSETS","true");
        vm.expectRevert(bytes("USDC unavailable"));script.run();
    }
    function testDeploymentWiring() public {
        Deploy script=new Deploy();ProvenanceStub stub=new ProvenanceStub();vm.etch(USDC,address(stub).code);
        vm.chainId(99801);vm.setEnv("CONFIRM_TESTNET_ASSETS","true");
        vm.setEnv("DEPLOYER","0x000000000000000000000000000000000000bEEF");vm.deal(address(0xbEEF),100 ether);
        (address wrapper,address factory,address router,address pair)=script.run();
        require(wrapper.code.length>0&&router.code.length>0&&pair.code.length>0,"deployed code");
        require(IFactory(factory).getPair(USDC,wrapper)==pair,"pair wiring");
        require(IFactory(factory).feeToSetter()==address(0),"admin disabled");
        require(IRouter(router).WETH()==wrapper,"native wrapper");
        require(IPair(pair).totalSupply()==0,"unseeded");
    }
}
