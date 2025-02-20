# Tutorial: withdraw DKA
`dka-withdraw` shows how to move DKA token from the Dkargo chain to Arbitrum chain.<br/>
Our Dkargo SDK provides a simply convenience method for withdraw DKA token, abstracting away the need for the client to connect to any contracts manually.

Note that this repo covers initiating a withdrawal. For a demo on releasing the funds from the Outbox, see [outbox-execute](../outbox-execute/)


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
    # @link. TODO
    DKA_CHAIN_RPC=
    ```

2. **Run script**
    ```
    ts-node ./scripts/dka-withdraw.ts
    ```


---