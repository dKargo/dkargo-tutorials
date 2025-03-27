import { providers, utils, Wallet } from 'ethers';
import dotenv from 'dotenv';
import { DkaBridge, getDkargoNetwork } from '@dkargo/sdk';
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

  const arbWallet = new Wallet(walletPrivateKey, arbProvider);
  const dkaWallet = new Wallet(walletPrivateKey, dkaProvider);

  /**
   * Only For register Local Test NetworkInfo
   */
  await registerTestNetwork(dkaProvider);

  /**
   * Set the amount to be withdraw from the dkargo chain (in wei)
   */
  const withdrawAmount = utils.parseEther('0.000001');

  /**
   * Use DkargoNetwork to create an Dkargo SDK DkaBridge instance
   * We'll use DkaBridge for its convenience methods around transferring the native asset to the dkargo chain
   */
  const network = await getDkargoNetwork(dkaProvider);
  const dkaBridge = new DkaBridge(network);

  /**
   * We're ready to withdraw the native asset using the DkaBridger instance from dkargo SDK
   * It will use our current wallet's address as the default destination
   */
  const withdrawTransaction = await dkaBridge.withdraw({
    childSigner: dkaWallet,
    amount: withdrawAmount,
    destinationAddress: arbWallet.address,
    from: dkaWallet.address,
  });

  const withdrawTransactionReceipt = await withdrawTransaction.wait();

  /**
   * And with that, our withdrawal is initiated! No additional time-sensitive actions are required.
   * Any time after the transaction's assertion is confirmed, funds can be transferred out of the bridge via the outbox contract
   *
   * We'll display the withdrawals event data here:
   */
  console.log(`DKA withdrawal initiated! 🥳 ${withdrawTransactionReceipt.transactionHash}`);

  const withdrawEventsData = withdrawTransactionReceipt.getChildToParentEvents();
  withdrawEventsData.map((event) => {
    const { arbBlockNum, caller, callvalue, data, destination, ethBlockNum, timestamp } = event;
    const { position, hash } = event as any;
    console.log(`  - hash : ${hash}`);
    console.log(`  - position : ${position}`);
    console.log(`  - arbBlockNum : ${arbBlockNum}`);
    console.log(`  - ethBlockNum : ${ethBlockNum}`);
    console.log(`  - caller : ${caller}`);
    console.log(`  - destination : ${destination}`);
    console.log(`  - callvalue : ${callvalue}`);
    console.log(`  - timestamp : ${timestamp}`);
    console.log(`  - data : ${data}`);
    console.log();
  });

  /**
   * Note that in principle, a single transaction could trigger any number of outgoing messages; the common case will be there's only one.
   * For the sake of this script, we assume there's only one, so we just grab the first one.
   */
  const messages = await withdrawTransactionReceipt.getChildToParentMessages(arbWallet);
  const childToParentMessage = messages[0];

  /**
   * After a withdrawal request, ~6.4 days(challenge period) must pass before receiving DKA on L2, during which time the tokens remain in a pending state.
   *
   * Before we try to execute our message, we need to make sure the child chain's block is included and confirmed!
   * (it can only be confirmed after the dispute period)
   * Method `waitUntilReadyToExecute()` waits until the item outbox entry exists
   */
  const timeToWaitMs = 1000 * 60;
  console.log(
    "Waiting for the outbox entry to be created. This only happens when the dkargo chain's block is confirmed on the parent chain, around ~1 week after it's creation(challenge period)."
  );
  await childToParentMessage.waitUntilReadyToExecute(dkaProvider, timeToWaitMs);
  console.log('Outbox entry exists! Trying to execute now -- 🚀');

  console.log(
    ` ㄴ To claim funds (after dispute period), run the 'outbox-execute tutorial' using the transaction hash ${withdrawTransactionReceipt.transactionHash} 🫡`
  );
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
