// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.30;
import {Vm,IERC20,IWrapped,IFactory,IPair,IRouter} from "../src/Interfaces.sol";

contract MockUSDC {
    string public constant name = "Mock USDC";
    string public constant symbol = "USDC";
    uint8 public constant decimals = 6;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    function mint(address to,uint256 value) external {balanceOf[to]+=value;totalSupply+=value;}
    function approve(address to,uint256 value) external returns(bool) {allowance[msg.sender][to]=value;return true;}
    function transfer(address to,uint256 value) external returns(bool) {balanceOf[msg.sender]-=value;balanceOf[to]+=value;return true;}
    function transferFrom(address from,address to,uint256 value) external returns(bool) {
        if(allowance[from][msg.sender]!=type(uint256).max) allowance[from][msg.sender]-=value;
        balanceOf[from]-=value;balanceOf[to]+=value;return true;
    }
}
contract DexFixture {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    MockUSDC usdc;
    IWrapped wrapped;
    IFactory factory;
    IRouter router;
    IPair pair;
    address constant ALICE = address(0xA11CE);
    address constant BOB = address(0xB0B);
    receive() external payable {}
    function deploy(string memory file,bytes memory args) internal returns(address instance) {
        bytes memory code = abi.encodePacked(vm.getCode(file),args);
        assembly {instance := create(0,add(code,32),mload(code))}
        require(instance!=address(0),"create");
    }
    function setUp() public virtual {
        wrapped=IWrapped(deploy("artifacts/WETH9.json",""));
        factory=IFactory(deploy("artifacts/UniswapV2Factory.json",abi.encode(address(0))));
        router=IRouter(deploy("artifacts/UniswapV2Router02.json",abi.encode(address(factory),address(wrapped))));
        usdc=new MockUSDC();
        pair=IPair(factory.createPair(address(wrapped),address(usdc)));
        vm.deal(ALICE,10000 ether);vm.deal(BOB,10000 ether);
        usdc.mint(ALICE,1000000e6);usdc.mint(BOB,1000000e6);
        vm.startPrank(ALICE);
        usdc.approve(address(router),type(uint256).max);
        router.addLiquidityETH{value:100 ether}(address(usdc),2000e6,2000e6,100 ether,ALICE,block.timestamp);
        vm.stopPrank();
    }
    function path(bool hypeIn) internal view returns(address[] memory p) {
        p=new address[](2);p[0]=hypeIn?address(wrapped):address(usdc);p[1]=hypeIn?address(usdc):address(wrapped);
    }
    function reserves() internal view returns(uint256 h,uint256 u) {
        (uint112 a,uint112 b,)=pair.getReserves();
        return pair.token0()==address(wrapped)?(a,b):(b,a);
    }
}
contract DexTest is DexFixture {
    function testInitialLiquidityAndNoAdmin() public view {
        require(pair.balanceOf(address(0))==1000,"locked minimum");
        require(pair.balanceOf(ALICE)+1000==pair.totalSupply(),"LP supply");
        require(factory.feeTo()==address(0)&&factory.feeToSetter()==address(0),"protocol fees disabled");
        require(router.factory()==address(factory)&&router.WETH()==address(wrapped),"router wiring");
    }
    function testHypeToUsdcMatchesFeeFormula() public {
        uint256 expected=uint256(1 ether)*997*2000e6/(100 ether*1000+1 ether*997);
        uint256 beforeBalance=usdc.balanceOf(BOB);
        vm.prank(BOB);router.swapExactETHForTokens{value:1 ether}(expected,path(true),BOB,block.timestamp);
        require(usdc.balanceOf(BOB)-beforeBalance==expected,"output");
        (uint256 h,uint256 u)=reserves();require(h*u>=100 ether*2000e6,"k");
    }
    function testUsdcToNativeHype() public {
        uint256 expected=router.getAmountsOut(20e6,path(false))[1];
        uint256 beforeBalance=BOB.balance;
        vm.startPrank(BOB);usdc.approve(address(router),20e6);
        router.swapExactTokensForETH(20e6,expected,path(false),BOB,block.timestamp);vm.stopPrank();
        require(BOB.balance-beforeBalance==expected,"native output");
        require(wrapped.balanceOf(address(router))==0&&address(router).balance==0,"router residue");
    }
    function testSlippageAndDeadlineRevert() public {
        vm.startPrank(BOB);vm.expectRevert(bytes("UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT"));
        router.swapExactETHForTokens{value:1 ether}(2000e6,path(true),BOB,block.timestamp);
        vm.warp(100);vm.expectRevert(bytes("UniswapV2Router: EXPIRED"));
        router.swapExactETHForTokens{value:1 ether}(1,path(true),BOB,99);vm.stopPrank();
    }
    function testApprovalRequired() public {
        vm.prank(BOB);vm.expectRevert();router.swapExactTokensForETH(20e6,1,path(false),BOB,block.timestamp);
    }
    function testOptimalLiquidityRefund() public {
        uint256 beforeBalance=BOB.balance;
        vm.startPrank(BOB);usdc.approve(address(router),20e6);
        (uint256 u,uint256 h,uint256 lp)=router.addLiquidityETH{value:2 ether}(address(usdc),20e6,20e6,1 ether,BOB,block.timestamp);
        vm.stopPrank();require(u==20e6&&h==1 ether&&lp>0,"ratio");
        require(beforeBalance-BOB.balance==1 ether,"refund");
    }
    function testRemoveLiquidityAndMinimums() public {
        uint256 lp=pair.balanceOf(ALICE)/2;
        vm.startPrank(ALICE);pair.approve(address(router),lp);
        vm.expectRevert(bytes("UniswapV2Router: INSUFFICIENT_A_AMOUNT"));
        router.removeLiquidityETH(address(usdc),lp,2001e6,0,ALICE,block.timestamp);
        uint256 nativeBefore=ALICE.balance;uint256 usdcBefore=usdc.balanceOf(ALICE);
        (uint256 u,uint256 h)=router.removeLiquidityETH(address(usdc),lp,999e6,49 ether,ALICE,block.timestamp);
        vm.stopPrank();require(ALICE.balance-nativeBefore==h&&usdc.balanceOf(ALICE)-usdcBefore==u,"withdrawn assets");
    }
    function testDuplicatePairAndIdenticalTokensRevert() public {
        vm.expectRevert(bytes("UniswapV2: PAIR_EXISTS"));factory.createPair(address(usdc),address(wrapped));
        vm.expectRevert(bytes("UniswapV2: IDENTICAL_ADDRESSES"));factory.createPair(address(usdc),address(usdc));
    }
    function testInsufficientRepaymentCannotDrainPool() public {
        vm.expectRevert(bytes("UniswapV2: INSUFFICIENT_INPUT_AMOUNT"));pair.swap(1,0,BOB,"");
    }
    function testReentrancyLockedDuringFlashCallback() public {
        FlashReenter attack=new FlashReenter(pair);
        vm.expectRevert(bytes("UniswapV2: LOCKED"));pair.swap(1,0,address(attack),hex"01");
    }
    function testFuzzSwapInvariant(uint96 raw,bool hypeIn) public {
        uint256 amount=uint256(raw)%(hypeIn?10 ether:200e6)+(hypeIn?1e12:1);
        (uint256 h0,uint256 u0)=reserves();
        uint256 expected=router.getAmountsOut(amount,path(hypeIn))[1];
        vm.startPrank(BOB);
        if(hypeIn) router.swapExactETHForTokens{value:amount}(expected,path(true),BOB,block.timestamp);
        else {usdc.approve(address(router),amount);router.swapExactTokensForETH(amount,expected,path(false),BOB,block.timestamp);}
        vm.stopPrank();(uint256 h,uint256 u)=reserves();require(h*u>=h0*u0,"k decreased");
    }
    function testFuzzLiquidityRoundTrip(uint64 raw) public {
        uint256 h=(uint256(raw)%1000000+1)*1e12;
        uint256 u=h*20e6/1 ether;
        vm.startPrank(BOB);usdc.approve(address(router),u);
        (uint256 usedU,uint256 usedH,uint256 lp)=router.addLiquidityETH{value:h}(address(usdc),u,0,0,BOB,block.timestamp);
        pair.approve(address(router),lp);
        (uint256 outU,uint256 outH)=router.removeLiquidityETH(address(usdc),lp,0,0,BOB,block.timestamp);vm.stopPrank();
        require(outU<=usedU&&outH<=usedH,"round trip creates value");
        require(usedU-outU<=1&&usedH-outH<1e9,"excess rounding loss");
    }
}
contract FlashReenter {
    IPair immutable pair;
    constructor(IPair p){pair=p;}
    function uniswapV2Call(address,uint256,uint256,bytes calldata) external {pair.sync();}
}
contract SwapHandler {
    IRouter immutable router;MockUSDC immutable usdc;IWrapped immutable wrapped;IPair immutable pair;
    uint256 public lastK;
    bool public decreased;
    constructor(IRouter r,MockUSDC u,IWrapped w,IPair p){router=r;usdc=u;wrapped=w;pair=p;u.approve(address(r),type(uint256).max);}
    receive() external payable {}
    function swap(uint64 seed,bool hypeIn) external {
        (uint112 r0,uint112 r1,)=pair.getReserves();uint256 beforeK=uint256(r0)*r1;
        address[] memory p=new address[](2);p[0]=hypeIn?address(wrapped):address(usdc);p[1]=hypeIn?address(usdc):address(wrapped);
        uint256 amount=hypeIn?(uint256(seed)%1 ether)+1e12:(uint256(seed)%20e6)+1;
        if(hypeIn)router.swapExactETHForTokens{value:amount}(0,p,address(this),block.timestamp);
        else router.swapExactTokensForETH(amount,0,p,address(this),block.timestamp);
        (r0,r1,)=pair.getReserves();lastK=uint256(r0)*r1;if(lastK<beforeK)decreased=true;
    }
}
contract DexInvariantTest is DexFixture {
    SwapHandler handler;
    function setUp() public override {
        super.setUp();handler=new SwapHandler(router,usdc,wrapped,pair);
        vm.deal(address(handler),10000 ether);usdc.mint(address(handler),1000000e6);
    }
    function targetContracts() external view returns(address[] memory a){a=new address[](1);a[0]=address(handler);}
    function invariantReservesBackedAndKMonotonic() public view {
        (uint256 h,uint256 u)=reserves();require(wrapped.balanceOf(address(pair))>=h&&usdc.balanceOf(address(pair))>=u,"backing");
        require(!handler.decreased(),"k");require(pair.balanceOf(address(0))==1000,"minimum burned");
    }
}
