import { providers, utils, Wallet } from 'ethers';
import dotenv from 'dotenv';
import { getDkargoNetwork, ParentToChildMessageStatus, TokenBridge } from '@dkargo/sdk';
import { registerTestNetwork } from '../../../test/testHelper';
import { ERC20Token, ERC20Token__factory } from '../../erc20-withdraw/build/types';
dotenv.config();

const main = async () => {
  /**
   * Set up: instantiate wallets connected to providers
   */
  if (!process.env.PRIVATE_KEY) {
    throw new Error(`The following environmental variables are required: PRIVATE_KEY`);
  }

  if (!process.env.ARB_CHAIN_RPC || !process.env.DKA_CHAIN_RPC) {
    throw new Error(`The following environmental variables are required: ARB_CHAIN_RPC, DKA_CHAIN_RPC`);
  }

  const walletPrivateKey = process.env.PRIVATE_KEY;
  const arbProvider = new providers.JsonRpcProvider(process.env.ARB_CHAIN_RPC);
  const dkaProvider = new providers.JsonRpcProvider(process.env.DKA_CHAIN_RPC);
  /**
   * Only For register Local Test NetworkInfo
   */
  await registerTestNetwork(dkaProvider);

  const arbWallet = new Wallet(walletPrivateKey, arbProvider);
  const dkaWallet = new Wallet(walletPrivateKey, dkaProvider);

  /**
   * Use DkargoNetwork to create an Dkargo SDK TokenBridge instance
   * We'll use TokenBridge for its convenience methods around transferring the ERC20 Token asset to the dkargo chain
   */
    const network = await getDkargoNetwork(dkaProvider);
    const tokenBridge = new TokenBridge(network);

    
  /**
   * Set the erc20 token contract address in the arbitrum chain
   * @dev If `process.env.ERC20_TOKEN_ADDRESS` is not set, a new ERC20 contract will be deployed on the Arbitrum chain.
   */
  let arbERC20: ERC20Token;
  if (process.env.ERC20_TOKEN_ADDRESS) {
    arbERC20 = ERC20Token__factory.connect(process.env.ERC20_TOKEN_ADDRESS, arbWallet);
  } else {
    console.log('Deploying the test Demo token to the arbitrum chain:');

    const erc20_factory = new ERC20Token__factory(arbWallet);
    arbERC20 = await erc20_factory.deploy('Demo Token', 'DEMO', '100000000');
    await arbERC20.deployed();
    console.log(`ㄴ Demo token is deployed to the arbitrum chain at ${arbERC20.address}`);
  }

  /**
   * Set the amount to be deposited in the dka chain (in wei)
   */
  const depositAmount = utils.parseEther('1');

  /**
   * To transfer ERC20 tokens held on L2 to the dKargo chain,
   * you must approve to Inbox Contract to access your DKA tokens.
   */
  const responseApproveGasToken = await tokenBridge.approveGasToken({
    erc20ParentAddress: arbERC20.address,
    parentSigner: arbWallet,
    amount: depositAmount,
  });

  const approveGasTokenReceipt = await responseApproveGasToken.wait();
  console.log(`Approve DKA token to Inbox Contract tx hash: ${approveGasTokenReceipt.transactionHash}`);

  const allowanceGasToken = await tokenBridge.allowanceGasTokenToGateway(arbERC20.address, arbWallet.address, arbProvider);
  console.log(` ㄴ Allowance DKA Token amount: ${allowanceGasToken}`);

  /**
   * To transfer ERC20 tokens held on L2 to the dKargo chain,
   * you must approve to Gatway to access your ERC20 tokens.
   */
  const responseApproveERC20Token = await tokenBridge.approveToken({
    erc20ParentAddress: arbERC20.address,
    parentSigner: arbWallet,
    amount: depositAmount,
  });

  const approveERC20Receipt = await responseApproveERC20Token.wait();
  console.log(`Approve ERC20 token to Gateway tx hash: ${approveERC20Receipt.transactionHash}`);

  const allowanceERC20Token = await tokenBridge.allowanceTokenToGateway(arbERC20.address, arbWallet.address, arbProvider);
  console.log(` ㄴ Allowance ERC20 token amount: ${allowanceERC20Token}`);

  /**
   * Transfer ERC20 token from arbitrum to dkargo chain
   * This convenience method automatically queries for the retryable's max submission cost and forwards the appropriate amount to the child chain
   * @dev If you want to generate data without sending a transaction, try using the `tokenBridge.getDepositRequest()` function
   */
  const responseDeposit = await tokenBridge.deposit({
    erc20ParentAddress: arbERC20.address,
    amount: depositAmount,
    parentSigner: arbWallet,
    childProvider: dkaProvider,
  });

  const receipt = await responseDeposit.wait();
  console.log('Deposit receipt on the arbitrum chain is:', receipt.transactionHash);

  /**
   * With the transaction confirmed on the arbitrum chain, we now wait for the child chain's side (i.e., balance credited to the dkargo chain) to be confirmed as well.
   * Here we're waiting for the sequencer to include the message in its off-chain queue. The sequencer should include it in around 15 minutes.
   */
  console.log(` ㄴ Now we wait for dkargo chain's side of the transaction to be executed ⏳`);
  const transactionResult = await receipt.waitForChildTransactionReceipt(dkaProvider);

  /**
   * The `complete` boolean tells us if the cross-chain message was successful
   */
  if (transactionResult.complete) {
    console.log(
      `Message successfully executed on the dkargo chain. Status: ${
        ParentToChildMessageStatus[await transactionResult.message.status()]
      }`
    );
  } else {
    throw new Error(
      `Message failed execution on the dkargo chain . Status ${
        ParentToChildMessageStatus[await transactionResult.message.status()]
      }`
    );
  }

  /**
   * Our wallet's balance on the arbitrum and dkargo chain should be updated now
   */
  const updatedArbDkaBalance = await tokenBridge.getChildErc20Balance(
    arbERC20.address,
    dkaWallet.address,
    arbProvider,
    dkaProvider
  );

  console.log(` ㄴ Your balance in the Dkargo chain is updated ${utils.formatEther(updatedArbDkaBalance.toString())} Token`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
