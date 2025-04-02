# Tutorial: Register custom ERC20 token
`custom-token-bridging` shows how to register Custome ERC20 token to Gateway contract.<br/>
Our Dkargo SDK provides a simply convenience method for depositing ERC20 token, abstracting away the need for the client to connect to any contracts manually.

# Token Bridge
The Arbitrum Chain (Layer 2, L2) hosts a variety of ERC-20 tokens, such as WETH and UNI.
These assets can be permissionlessly bridged to dKargo Chain (Layer 3, L3) using the dKargo Token Bridge.
The process of bridging ERC-20 tokens from Arbitrum to dKargo Chain follows a different procedure than bridging DKA native tokens.

The Token Bridge is a dApp deployed on both Arbitrum Chain and dKargo Chain, facilitating secure and trustless ERC-20 token bridging.
It utilizes [Arbitrum's cross-chain messaging system (retryable tickets)](https://docs.arbitrum.io/build-decentralized-apps/cross-chain-messaging) to ensure reliability.
The dKargo Token Bridge is built on [Offchain Labs' Canonical Bridge](https://github.com/OffchainLabs/token-bridge-contracts), a well-established solution that has already bridged hundreds of ERC-20 tokens on Arbitrum, ensuring high security and seamless user experience.

For info on how it works under the hood, see our [token bridging docs](https://docs.arbitrum.io/build-decentralized-apps/token-bridging/token-bridge-erc20).

# Generic-custom Gateway
For token movement between Arbitrumn and dKargo, the [`Standard Gateway`](../erc20-deposit/readme.md#standard-token-bridge) method is generally sufficient.

However, in the Standard Gateway model:
- When depositing tokens, an ERC-20 token contract on dKargo Chain is automatically deployed.
- This contract is enforced to use [StandardArbERC20.sol](https://github.com/OffchainLabs/token-bridge-contracts/blob/main/contracts/tokenbridge/arbitrum/StandardArbERC20.sol), limiting customization.

For developers or project builders who want:
- To add custom functionalities to their ERC-20 contract
- To pair their own ERC-20 contract on dKargo Chain with a specific contract

Using the Generic-Custom Gateway provides greater flexibility in these cases.

For info on how it works under the hood, see our [generic-custom gateway docs](https://docs.arbitrum.io/build-decentralized-apps/token-bridging/bridge-tokens-programmatically/how-to-bridge-tokens-generic-custom).


> [!IMPORTANT]
> The dKargo Token Bridge is a dApp built using [Arbitrum’s Retryable Ticket](https://docs.arbitrum.io/how-arbitrum-works/l1-to-l2-messaging#retryable-tickets) mechanism. A Retryable Ticket allows an L2 transaction to be generated and executed on L3. Through this mechanism, users can initiate L3 transactions directly from L2. The required transaction fees are paid in ERC-20 DKA on L2.

##  Run on testnet
1. **Compile Smart Contract ABI**
    ```
    npx hardhat compile
    ```
2. **Set environment variables**
    
    Set the values shown in `.env.example` as environmental variables. To copy it into a `.env` file:
    ```
    cp .env.example .env
    ```

    <br/>

    You'll still need to edit some variables, i.e., `PRIVATE_KEY`, `DKA_CHAIN_RPC` and `ARB_CHAIN_RPC`.

    ```
    # Your private key
    PRIVATE_KEY=

    # The Arbitrum chain's RPC
    # For the public RPC URL, please refer to the official Arbitrum docs.
    # @link. https://docs.arbitrum.io/for-devs/dev-tools-and-resources/chain-info#arbitrum-public-rpc-endpoints
    ARB_CHAIN_RPC=

    # The Dkargo chain's RPC
    # For the public RPC URL, please refer to the official dKargo docs.
    # @link. https://docs.dkargo.io/docs2-eng/run-dkargo-node/chain-rpc
    DKA_CHAIN_RPC=

    ```

2. **Run script**
    ```
    ts-node ./scripts/register.ts
    ```


---