export const CONTRACT_CONFIG = {
  network: 'testnet',
  networkPassphrase: 'Test SDF Network ; September 2015',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  explorerBaseUrl: 'https://stellar.expert/explorer/testnet',
  contractId: 'CDMIUSBICNTNORQQPR4YEUDJT4AX4NEJXOUKGT3WEILFXTBFGRQPAK6H',
  deployerPublicKey: 'GC7YY3HPGWLR5H6MPF6JFZ7K3C5WQFOSU7XUAJLWCPD3QKLXRDFTPPZU',
  tokenName: 'Stellar Token Vault',
  tokenSymbol: 'STV',
  tokenDecimals: 7,
  deployedAt: '2026-06-27T21:49:35Z',
  projectName: 'Stellar-token-dapp',
  repository: 'https://github.com/Uyen-dev-k9/Stellar-token-dapp'
} as const;

export const hasDeployedContract = CONTRACT_CONFIG.contractId.length > 0;

export const getContractExplorerUrl = () =>
  CONTRACT_CONFIG.explorerBaseUrl + '/contract/' + CONTRACT_CONFIG.contractId;
