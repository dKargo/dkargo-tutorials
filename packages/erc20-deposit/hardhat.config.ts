import { HardhatUserConfig } from 'hardhat/config';
import "@nomiclabs/hardhat-ethers"
import '@typechain/hardhat'

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  paths: {
    artifacts: 'build/contracts',
  },
  solidity: {
    compilers: [
      {
        version: '0.8.20',
        settings: {},
      },
      {
        version: '0.8.16',
        settings: {},
      },
      {
        version: '0.8.9',
        settings: {},
      },
      {
        version: '0.7.2',
        settings: {},
      },
      {
        version: '0.6.12',
        settings: {},
      },
      {
        version: '0.6.11',
        settings: {},
      },
      {
        version: '0.4.22',
        settings: {},
      },
    ],
  },
  typechain: {
    outDir: 'build/types',
    target: 'ethers-v5',
  },
};

export default config;
