// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ICustomToken} from "@arbitrum/token-bridge-contracts/contracts/tokenbridge/ethereum/ICustomToken.sol";
import "@arbitrum/token-bridge-contracts/contracts/tokenbridge/ethereum/gateway/L1CustomGateway.sol";

import {L1OrbitGatewayRouter} from "@arbitrum/token-bridge-contracts/contracts/tokenbridge/ethereum/gateway/L1OrbitGatewayRouter.sol";
import {L1OrbitCustomGateway} from "@arbitrum/token-bridge-contracts/contracts/tokenbridge/ethereum/gateway/L1OrbitCustomGateway.sol";
import {IL1GatewayRouter} from "@arbitrum/token-bridge-contracts/contracts/tokenbridge/ethereum/gateway/IL1GatewayRouter.sol";
import { IERC20Bridge } from "@arbitrum/token-bridge-contracts/contracts/tokenbridge/libraries/IERC20Bridge.sol";

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";


contract L2TokenCustomGas is Ownable, ERC20, ICustomToken {
    using SafeERC20 for IERC20;

    address public gateway;
    address public router;
    bool internal shouldRegisterGateway;

    constructor(string memory name_, string memory symbol_,uint256 _initialSupply,address _gateway, address _router) ERC20(name_, symbol_) {
        gateway = _gateway;
        router = _router;
        _mint(msg.sender, _initialSupply * 10 ** decimals());
    }

    function mint() external {
        _mint(msg.sender, 50000000);
    }

    /// @dev See {ERC20-transferFrom}
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override(ICustomToken, ERC20) returns (bool) {
        return super.transferFrom(sender, recipient, amount);
    }

    /// @dev See {ERC20-balanceOf}
    function balanceOf(address account) public view override(ICustomToken, ERC20) returns (uint256) {
        return super.balanceOf(account);
    }

    /// @dev we only set shouldRegisterGateway to true when in `registerTokenOnL2`
    function isArbitrumEnabled() external view override returns (uint8) {
        require(shouldRegisterGateway, "NOT_EXPECTED_CALL");
        return uint8(0xb1);
    }

    function registerTokenOnL2(
        address l2CustomTokenAddress,
        uint256 maxSubmissionCostForCustomGateway,
        uint256 maxSubmissionCostForRouter,
        uint256 maxGasForCustomGateway,
        uint256 maxGasForRouter,
        uint256 gasPriceBid,
        uint256 valueForGateway,
        uint256 valueForRouter,
        address creditBackAddress
    ) public payable override onlyOwner {
        // we temporarily set `shouldRegisterGateway` to true for the callback in registerTokenToL2 to succeed
        bool prev = shouldRegisterGateway;
        shouldRegisterGateway = true;

        address inbox = IL1GatewayRouter(router).inbox();
        address bridge = address(IInbox(inbox).bridge());

        // transfer fees from user to here, and approve router to use it
        {
            address nativeToken = IERC20Bridge(bridge).nativeToken();

            IERC20(nativeToken).safeTransferFrom(
                msg.sender,
                address(this),
                valueForGateway + valueForRouter
            );
            IERC20(nativeToken).approve(router, valueForRouter);
            IERC20(nativeToken).approve(gateway, valueForGateway);
        }

        L1OrbitCustomGateway(gateway).registerTokenToL2(
            l2CustomTokenAddress,
            maxGasForCustomGateway,
            gasPriceBid,
            maxSubmissionCostForCustomGateway,
            creditBackAddress,
            valueForGateway
        );

        L1OrbitGatewayRouter(router).setGateway(
            gateway,
            maxGasForRouter,
            gasPriceBid,
            maxSubmissionCostForRouter,
            creditBackAddress,
            valueForRouter
        );

        // reset allowance back to 0 in case not all approved native tokens are spent
        {
            address nativeToken = IERC20Bridge(bridge).nativeToken();

            IERC20(nativeToken).approve(router, 0);
            IERC20(nativeToken).approve(gateway, 0);
        }

        shouldRegisterGateway = prev;
    }
}
