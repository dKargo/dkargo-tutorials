import { providers, utils, Wallet } from 'ethers';
import dotenv from 'dotenv';
import { CustomTokenBridge, getDkargoNetwork, ParentToChildMessageStatus, TokenBridge } from '@dkargo/sdk';
import { L2TokenCustomGas__factory, L3Token__factory } from '../build/types';
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
  const dkaWallet = new Wallet(walletPrivateKey, dkaProvider);

  /**
   * Use DkargoNetwork to create an Dkargo SDK CustomTokenBridge instance
   * We'll use CustomTokenBridge for its convenience methods around transferring the Customed ERC20 Token asset to the dkargo chain
   */
  const network = await getDkargoNetwork(dkaProvider);
  const customTokenBridge = new CustomTokenBridge(network);

  /**
   * Depoly the customed erc20 token contract in the arbitrum chain and dkargo chain
   */
  const { parentCustomGateway, childCustomGateway, parentGatewayRouter } = customTokenBridge.childNetwork.tokenBridge;
  const l2_erc20_factory = new L2TokenCustomGas__factory(arbWallet);
  console.log('Deploying the test Demo custom token to the arbitrum chain:');
  const parentERC20 = await l2_erc20_factory.deploy(
    'CUSTOM_DEMO_TOKEN',
    'CUSTOM',
    '100000000',
    parentCustomGateway,
    parentGatewayRouter
  );
  await parentERC20.deployed();
  console.log(`ㄴ Demo custom token is deployed to the arbitrum chain at ${parentERC20.address} \n`);
  console.log('Deploying the test Demo custom token to the dkargo chain:');
  const l3_erc20_factory = new L3Token__factory(dkaWallet);
  const childERC20 = await l3_erc20_factory.deploy('CUSTOM_DEMO_TOKEN', 'CUSTOM', childCustomGateway, parentERC20.address);
  await childERC20.deployed();
  console.log(`ㄴ Demo custom token is deployed to the dkargo chain at ${childERC20.address}\n`);
  console.log(`ㄴ Demo custom token is deployed to the dkargo chain at ${childCustomGateway}\n`);

  /**
   * To register ERC20 tokens held on L2 to the dKargo chain,
   * you must approve to Inbox Contract to access your DKA tokens.
   */
  const responseApproveGasToken = await customTokenBridge.approveGasTokenForCustomTokenRegistration({
    erc20ParentAddress: parentERC20.address,
    parentSigner: arbWallet,
  });

  const approveGasTokenReceipt = await responseApproveGasToken.wait();
  console.log(`Approve DKA token to Inbox Contract tx hash: ${approveGasTokenReceipt.transactionHash}`);

  const allowanceGasToken = await customTokenBridge.allowanceGasTokenToParentERC20(
    parentERC20.address,
    arbWallet.address,
    arbProvider
  );
  console.log(` ㄴ Allowance DKA Token amount: ${allowanceGasToken}\n`);

  /**
   * Register custom token on our custom gateway
   */
  const responseRegister = await customTokenBridge.registerCustomToken(
    parentERC20.address,
    childERC20.address,
    arbWallet,
    dkaProvider
  );

  const receipt = await responseRegister.wait();
  console.log('Register receipt on the arbitrum chain is:', receipt.transactionHash);

  /**
   * With the transaction confirmed on the arbitrum chain, we now wait for the child chain's side (i.e., balance credited to the dkargo chain) to be confirmed as well.
   * Here we're waiting for the sequencer to include the message in its off-chain queue. The sequencer should include it in around 15 minutes.
   */
  console.log(` ㄴ Now we wait for dkargo chain's side of the transaction to be executed ⏳\n`);
  const transactionResult = await receipt.getParentToChildMessages(dkaProvider);
  const setTokenTx = await transactionResult[0].waitForStatus();
  const setGatewaysTx = await transactionResult[1].waitForStatus();

  /**
   * The `status` REDEEMED tells us if the cross-chain message was successful
   */
  if (setTokenTx.status == ParentToChildMessageStatus.REDEEMED) {
    console.log(
      `SetToken Message successfully executed on the dkargo chain. Status: ${ParentToChildMessageStatus[setTokenTx.status]}`
    );
  } else {
    throw new Error(
      `SetToken Message failed execution on the dkargo chain . Status ${ParentToChildMessageStatus[setTokenTx.status]}`
    );
  }

  if (setGatewaysTx.status == ParentToChildMessageStatus.REDEEMED) {
    console.log(
      `setGateways Message successfully executed on the dkargo chain. Status: ${
        ParentToChildMessageStatus[setGatewaysTx.status]
      }`
    );
  } else {
    throw new Error(
      `setGateways Message failed execution on the dkargo chain . Status ${ParentToChildMessageStatus[setGatewaysTx.status]}`
    );
  }

  console.log(`Your custom token is now registered on dkargo custom gateway 🥳 `);
  console.log(` ㄴ run the 'erc20-deposit' and 'erc20-withdraw' tutorial using the erc20 contract address deployed at arbitrum chain(L2): ${parentERC20.address}`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
