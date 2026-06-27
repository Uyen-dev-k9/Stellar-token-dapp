import * as StellarSdk from '@stellar/stellar-sdk';
import {
  CONTRACT_CONFIG,
  getContractExplorerUrl,
  hasDeployedContract,
} from '../contractConfig';
import { signWithFreighter } from './wallet';

const SDK = StellarSdk as any;

export type MintTokenInput = {
  admin: string;
  to: string;
  amount: string;
};

export type TransferTokenInput = {
  from: string;
  to: string;
  amount: string;
};

export type PayInvoiceInput = {
  payer: string;
  merchant: string;
  amount: string;
  memo: string;
};

export type SubmittedTransaction = {
  hash: string;
  status: string;
  explorerUrl: string;
};

export type RuntimeConfig = {
  network: string;
  rpcUrl: string;
  contractId: string;
  contractExplorerUrl: string;
  deployedAt: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  hasDeployedContract: boolean;
};

const getServer = () => {
  const ServerClass = SDK.SorobanRpc?.Server || SDK.rpc?.Server;

  if (!ServerClass) {
    throw new Error('Soroban RPC Server class was not found in @stellar/stellar-sdk.');
  }

  return new ServerClass(CONTRACT_CONFIG.rpcUrl, { allowHttp: false });
};

const getContract = () => {
  return new SDK.Contract(CONTRACT_CONFIG.contractId);
};

const buildAddressScVal = (address: string) => {
  return new SDK.Address(address).toScVal();
};

const buildStringScVal = (value: string) => {
  return SDK.nativeToScVal(value, { type: 'string' });
};

const buildI128ScVal = (value: string) => {
  return SDK.nativeToScVal(BigInt(value || '0'), { type: 'i128' });
};

const buildU32ScVal = (value: number) => {
  return SDK.nativeToScVal(value, { type: 'u32' });
};

const buildTransaction = async (sourcePublicKey: string, operation: unknown) => {
  const server = getServer();
  const sourceAccount = await server.getAccount(sourcePublicKey);

  const transaction = new SDK.TransactionBuilder(sourceAccount, {
    fee: SDK.BASE_FEE,
    networkPassphrase: CONTRACT_CONFIG.networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(60)
    .build();

  return server.prepareTransaction(transaction);
};

const submitSignedTransaction = async (signedXdr: string): Promise<SubmittedTransaction> => {
  const server = getServer();
  const signedTransaction = new SDK.Transaction(signedXdr, CONTRACT_CONFIG.networkPassphrase);
  const sendResult = await server.sendTransaction(signedTransaction);

  if (!sendResult.hash) {
    throw new Error(sendResult.errorResultXdr || 'Transaction was rejected by Soroban RPC.');
  }

  return {
    hash: sendResult.hash,
    status: sendResult.status || 'PENDING',
    explorerUrl: `${CONTRACT_CONFIG.explorerBaseUrl}/tx/${sendResult.hash}`,
  };
};

const invokeContract = async (
  sourcePublicKey: string,
  method: string,
  args: unknown[],
): Promise<SubmittedTransaction> => {
  const contract = getContract();
  const operation = contract.call(method, ...args);
  const preparedTransaction = await buildTransaction(sourcePublicKey, operation);
  const signedXdr = await signWithFreighter(preparedTransaction.toXDR(), sourcePublicKey);

  return submitSignedTransaction(signedXdr);
};

const simulateContract = async (sourcePublicKey: string, method: string, args: unknown[]) => {
  const server = getServer();
  const contract = getContract();
  const operation = contract.call(method, ...args);
  const sourceAccount = await server.getAccount(sourcePublicKey);

  const transaction = new SDK.TransactionBuilder(sourceAccount, {
    fee: SDK.BASE_FEE,
    networkPassphrase: CONTRACT_CONFIG.networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(60)
    .build();

  const simulation = await server.simulateTransaction(transaction);

  if (simulation.error) {
    throw new Error(simulation.error);
  }

  return simulation.result?.retval;
};

export const getRuntimeConfig = (): RuntimeConfig => {
  return {
    network: CONTRACT_CONFIG.network,
    rpcUrl: CONTRACT_CONFIG.rpcUrl,
    contractId: CONTRACT_CONFIG.contractId,
    contractExplorerUrl: getContractExplorerUrl(),
    deployedAt: CONTRACT_CONFIG.deployedAt,
    tokenName: CONTRACT_CONFIG.tokenName,
    tokenSymbol: CONTRACT_CONFIG.tokenSymbol,
    tokenDecimals: CONTRACT_CONFIG.tokenDecimals,
    hasDeployedContract,
  };
};

export const shortenAddress = (value: string, prefix = 8, suffix = 8) => {
  if (!value) {
    return 'Not available';
  }

  if (value.length <= prefix + suffix + 3) {
    return value;
  }

  return `${value.slice(0, prefix)}...${value.slice(-suffix)}`;
};

export const mintToken = async (input: MintTokenInput): Promise<SubmittedTransaction> => {
  return invokeContract(input.admin, 'mint_token', [
    buildAddressScVal(input.admin),
    buildAddressScVal(input.to),
    buildI128ScVal(input.amount),
  ]);
};

export const transferToken = async (input: TransferTokenInput): Promise<SubmittedTransaction> => {
  return invokeContract(input.from, 'transfer_token', [
    buildAddressScVal(input.from),
    buildAddressScVal(input.to),
    buildI128ScVal(input.amount),
  ]);
};

export const payInvoice = async (input: PayInvoiceInput): Promise<SubmittedTransaction> => {
  return invokeContract(input.payer, 'pay_invoice', [
    buildAddressScVal(input.payer),
    buildAddressScVal(input.merchant),
    buildI128ScVal(input.amount),
    buildStringScVal(input.memo),
  ]);
};

export const balanceOf = async (sourcePublicKey: string, account: string): Promise<unknown> => {
  const result = await simulateContract(sourcePublicKey, 'balance_of', [
    buildAddressScVal(account),
  ]);

  return result ? SDK.scValToNative(result) : null;
};

export const accountSummary = async (sourcePublicKey: string, account: string): Promise<unknown> => {
  const result = await simulateContract(sourcePublicKey, 'account_summary', [
    buildAddressScVal(account),
  ]);

  return result ? SDK.scValToNative(result) : null;
};

export const invoiceOf = async (sourcePublicKey: string, invoiceId: number): Promise<unknown> => {
  const result = await simulateContract(sourcePublicKey, 'invoice_of', [
    buildU32ScVal(invoiceId),
  ]);

  return result ? SDK.scValToNative(result) : null;
};

export const getStats = async (sourcePublicKey: string): Promise<unknown> => {
  const result = await simulateContract(sourcePublicKey, 'stats', []);

  return result ? SDK.scValToNative(result) : null;
};

export const getContractMethods = () => [
  'initialize',
  'token_metadata',
  'mint_token',
  'transfer_token',
  'pay_invoice',
  'balance_of',
  'account_summary',
  'invoice_of',
  'has_enough',
  'total_supply',
  'invoice_count',
  'stats',
];