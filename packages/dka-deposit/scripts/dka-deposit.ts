import { providers, utils, Wallet } from 'ethers';
import dotenv from 'dotenv';
import { DkaBridge, EthDepositMessageStatus, getDkargoNetwork } from '@dkargo/sdk';
import { registerTestNetwork } from '../../../test/testHelper';
dotenv.config();

const main = async () => {
  /**
   * Set up: instantiate wallets connected to providers
   */
  if (!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY is required');
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
   * Set the amount to be deposited in the dka chain (in wei)
   */
  const depositAmount = utils.parseEther('1');

  /**
   * Use DkargoNetwork to create an Dkargo SDK DkaBridge instance
   * We'll use DkaBridge for its convenience methods around transferring the native asset to the dkargo chain
   */
  const network = await getDkargoNetwork(dkaProvider);
  const dkaBridge = new DkaBridge(network);

  /**
   * First, let's check the wallet's initial balance in the arbtirum and dkargo chain
   */
  const initDkaBalance = await dkaWallet.getBalance();
  const initArbDkaBalance = await dkaBridge.getParentDkaBalance(arbWallet.address, arbProvider);

  /**
   * To transfer ERC20 DKA tokens held on L2 to the dKargo chain,
   * you must approve to Inbox Contract to access your DKA tokens.
   */
  const responseApprove = await dkaBridge.approveGasToken({
    parentSigner: arbWallet,
    amount: depositAmount,
  });

  const approveReceipt = await responseApprove.wait();
  console.log(`Approve DKA token to Inbox Contract tx hash: ${approveReceipt.transactionHash}`);

  const allowance = await dkaBridge.allowanceGasTokenToInbox(arbWallet.address, arbProvider);
  console.log(` ㄴ Allowance amount: ${allowance}`);

  /**
   * Transfer DKA token from arbitrum to dkargo chain
   * @dev If you want to generate data without sending a transaction, try using the `tokenBridge.getDepositRequest()` function
   */
  const responseDeposit = await dkaBridge.deposit({
    amount: depositAmount,
    parentSigner: arbWallet,
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
        EthDepositMessageStatus[await transactionResult.message.status()]
      }`
    );
  } else {
    throw new Error(
      `Message failed execution on the dkargo chain . Status ${
        EthDepositMessageStatus[await transactionResult.message.status()]
      }`
    );
  }

  /**
   * Our wallet's balance on the arbitrum and dkargo chain should be updated now
   */
  const updatedDkaBalance = await dkaWallet.getBalance();
  const updatedArbDkaBalance = await dkaBridge.getParentDkaBalance(arbWallet.address, arbProvider);

  console.log(
    ` ㄴ Your balance in the Arbitrum chain is updated from ${utils.formatEther(
      initArbDkaBalance.toString()
    )} ArbDka(ERC20) to ${utils.formatEther(updatedArbDkaBalance.toString())} ArbDka(ERC20)`
  );

  console.log(
    ` ㄴ Your balance in the Dkargo chain is updated from ${utils.formatEther(
      initDkaBalance.toString()
    )} Dka to ${utils.formatEther(updatedDkaBalance.toString())} Dka`
  );
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
