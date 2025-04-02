# Outbox tutorial: execute a child-to-parent message
The outbox contract is responsible for receiving and executing all "outgoing" messages; i.e., messages passed from a chain to its parent chain (for example, from Dkargo to Arbitrum).

The (expected) most-common use-case is withdrawals DKA, but the outbox handles any arbitrary contract call, as this tutorial illustrates.


##  Run on testnet
1. **Set environment variables**
    
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
    ts-node ./scripts/outbox-execute.ts 0xmytxnhash
    ```
    | `0xmytxnhash` is expected to be the transaction hash of a transaction in the child chain that triggered a child-to-parent message.


---