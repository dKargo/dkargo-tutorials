import { providers, Wallet } from 'ethers';
import dotenv from 'dotenv';
import { ChildToParentMessageStatus, ChildTransactionReceipt } from '@dkargo/sdk';
import { registerTestNetwork } from '../../../test/testHelper';
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
  
  /**
   * We start with a transaction hash;
   * we assume this is a transaction that triggered a child-to-parent message on the dkargo chain (i.e., ArbSys.sendTxToL1)
   */
  if (process.argv.length < 3) {
    console.log(`Missing transaction hash of the child chain that sent a child-to-parent message`);
    console.log(`Usage: yarn run outbox-exec <transaction hash>`);
    process.exit(1);
  }

  const transactionHash = process.argv[2];

  if (!transactionHash) {
    throw new Error('Provide a transaction hash of a transaction that sent a child-to-parent message');
  }
  if (!transactionHash.startsWith('0x') || transactionHash.trim().length != 66) {
    throw new Error(`Hmm, ${transactionHash} doesn't look like a txn hash...`);
  }

  /**
   * First, let's find the transaction from the transaction hash provided
   */
  const receipt = await dkaProvider.getTransactionReceipt(transactionHash);
  const transactionReceipt = new ChildTransactionReceipt(receipt);

  /**
   * Note that in principle, a single transaction could trigger any number of outgoing messages; the common case will be there's only one.
   * For the sake of this script, we assume there's only one, so we just grab the first one.
   */
  const messages = await transactionReceipt.getChildToParentMessages(arbWallet);
  const childToParentMessage = messages[0];

  /**
   * Check if already executed
   */
  if ((await childToParentMessage.status(dkaProvider)) == ChildToParentMessageStatus.EXECUTED) {
    throw new Error(`Message already executed! Nothing else to do here`);
  }

 /**
   * After a withdrawal request, ~6.4 days(challenge period) must pass before receiving DKA on L2, during which time the tokens remain in a pending state.
   * 
   * Before we try to execute our message, we need to make sure the child chain's block is included and confirmed!
   * (it can only be confirmed after the dispute period)
   * Method `waitUntilReadyToExecute()` waits until the item outbox entry exists
   */
  const timeToWaitMs = 1000 * 60;
  console.log(
    "Waiting for the outbox entry to be created. This only happens when the dkargo chain's block is confirmed on the parent chain, around ~1 week after it's creation (by default)."
  );
  await childToParentMessage.waitUntilReadyToExecute(dkaProvider, timeToWaitMs);
  console.log('Outbox entry exists! Trying to execute now -- 🚀');

  /**
   * Now that its confirmed and not executed, we can execute our message in its outbox entry.
   */
  const executeTransaction = await childToParentMessage.execute(dkaProvider);
  const executeTransactionReceipt = await executeTransaction.wait();
  console.log(' ㄴ Done! Your transaction is executed', executeTransactionReceipt.transactionHash);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
