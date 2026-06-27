import { describe, expect, it } from 'vitest';
import {
  accountSummary,
  balanceOf,
  getContractMethods,
  getRuntimeConfig,
  getStats,
  invoiceOf,
  mintToken,
  payInvoice,
  shortenAddress,
  transferToken,
} from './contract';

describe('Stellar Token dApp frontend contract integration', () => {
  it('loads deployed token vault runtime config', () => {
    const runtime = getRuntimeConfig();

    expect(runtime.network).toBe('testnet');
    expect(runtime.contractId.startsWith('C')).toBe(true);
    expect(runtime.rpcUrl).toContain('soroban-testnet');
    expect(runtime.contractExplorerUrl).toContain(runtime.contractId);
    expect(runtime.tokenSymbol).toBe('STV');
    expect(runtime.tokenDecimals).toBe(7);
    expect(runtime.hasDeployedContract).toBe(true);
  });

  it('maps frontend functions to real contract method names', () => {
    const methods = getContractMethods();

    expect(methods).toContain('initialize');
    expect(methods).toContain('token_metadata');
    expect(methods).toContain('mint_token');
    expect(methods).toContain('transfer_token');
    expect(methods).toContain('pay_invoice');
    expect(methods).toContain('balance_of');
    expect(methods).toContain('account_summary');
    expect(methods).toContain('invoice_of');
    expect(methods).toContain('has_enough');
    expect(methods).toContain('total_supply');
    expect(methods).toContain('invoice_count');
    expect(methods).toContain('stats');
  });

  it('exports real write transaction functions used by the UI', () => {
    expect(typeof mintToken).toBe('function');
    expect(typeof transferToken).toBe('function');
    expect(typeof payInvoice).toBe('function');
  });

  it('exports real read query functions used by the UI', () => {
    expect(typeof balanceOf).toBe('function');
    expect(typeof accountSummary).toBe('function');
    expect(typeof invoiceOf).toBe('function');
    expect(typeof getStats).toBe('function');
  });

  it('shortens contract IDs and transaction hashes for dashboard display', () => {
    const value = 'CDMIUSBICNTNORQQPR4YEUDJT4AX4NEJXOUKGT3WEILFXTBFGRQPAK6H';

    expect(shortenAddress(value)).toBe('CDMIUSBI...GRQPAK6H');
    expect(shortenAddress('')).toBe('Not available');
  });
});