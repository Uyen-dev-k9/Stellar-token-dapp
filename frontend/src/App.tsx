import { useMemo, useState } from 'react';
import './App.css';
import { CONTRACT_CONFIG } from './contractConfig';
import { connectWallet } from './services/wallet';
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
  type SubmittedTransaction,
} from './services/contract';

function App() {
  const runtime = useMemo(() => getRuntimeConfig(), []);
  const methods = useMemo(() => getContractMethods(), []);

  const [walletAddress, setWalletAddress] = useState('');
  const [adminAddress, setAdminAddress] = useState<string>(CONTRACT_CONFIG.deployerPublicKey);
  const [receiverAddress, setReceiverAddress] = useState('');
  const [merchantAddress, setMerchantAddress] = useState('');
  const [amount, setAmount] = useState('100');
  const [memo, setMemo] = useState('Token payment');
  const [invoiceId, setInvoiceId] = useState(1);

  const [statusMessage, setStatusMessage] = useState('Ready to connect Freighter on Stellar testnet.');
  const [lastTransaction, setLastTransaction] = useState<SubmittedTransaction | null>(null);
  const [queryResult, setQueryResult] = useState('Read results will appear here.');

  const requireWallet = async () => {
    if (walletAddress) {
      return walletAddress;
    }

    const connected = await connectWallet();
    setWalletAddress(connected);
    return connected;
  };

  const handleConnectWallet = async () => {
    try {
      setStatusMessage('Connecting Freighter wallet...');
      const connected = await connectWallet();
      setWalletAddress(connected);

      if (!receiverAddress) {
        setReceiverAddress(connected);
      }

      if (!merchantAddress) {
        setMerchantAddress(connected);
      }

      setStatusMessage('Wallet connected successfully.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Wallet connection failed.');
    }
  };

  const handleMintToken = async () => {
    try {
      const connected = await requireWallet();
      const admin = adminAddress || connected;
      const to = receiverAddress || connected;

      setStatusMessage('Preparing mint_token transaction. Please sign in Freighter.');

      const tx = await mintToken({
        admin,
        to,
        amount,
      });

      setLastTransaction(tx);
      setStatusMessage('mint_token transaction submitted to Stellar testnet.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'mint_token transaction failed.');
    }
  };

  const handleTransferToken = async () => {
    try {
      const from = await requireWallet();
      const to = receiverAddress || from;

      setStatusMessage('Preparing transfer_token transaction. Please sign in Freighter.');

      const tx = await transferToken({
        from,
        to,
        amount,
      });

      setLastTransaction(tx);
      setStatusMessage('transfer_token transaction submitted to Stellar testnet.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'transfer_token transaction failed.');
    }
  };

  const handlePayInvoice = async () => {
    try {
      const payer = await requireWallet();
      const merchant = merchantAddress || receiverAddress || payer;

      setStatusMessage('Preparing pay_invoice transaction. Please sign in Freighter.');

      const tx = await payInvoice({
        payer,
        merchant,
        amount,
        memo,
      });

      setLastTransaction(tx);
      setStatusMessage('pay_invoice transaction submitted to Stellar testnet.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'pay_invoice transaction failed.');
    }
  };

  const handleBalanceOf = async () => {
    try {
      const source = await requireWallet();
      const account = receiverAddress || source;

      setStatusMessage('Reading balance_of through Soroban RPC simulation.');

      const result = await balanceOf(source, account);
      setQueryResult(JSON.stringify(result, null, 2));
      setStatusMessage('balance_of query completed.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'balance_of query failed.');
    }
  };

  const handleAccountSummary = async () => {
    try {
      const source = await requireWallet();
      const account = receiverAddress || source;

      setStatusMessage('Reading account_summary through Soroban RPC simulation.');

      const result = await accountSummary(source, account);
      setQueryResult(JSON.stringify(result, null, 2));
      setStatusMessage('account_summary query completed.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'account_summary query failed.');
    }
  };

  const handleInvoiceOf = async () => {
    try {
      const source = await requireWallet();

      setStatusMessage('Reading invoice_of through Soroban RPC simulation.');

      const result = await invoiceOf(source, invoiceId);
      setQueryResult(JSON.stringify(result, null, 2));
      setStatusMessage('invoice_of query completed.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'invoice_of query failed.');
    }
  };

  const handleStats = async () => {
    try {
      const source = await requireWallet();

      setStatusMessage('Reading stats through Soroban RPC simulation.');

      const result = await getStats(source);
      setQueryResult(JSON.stringify(result, null, 2));
      setStatusMessage('stats query completed.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'stats query failed.');
    }
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <nav className="topbar">
          <div className="brand">
            <div className="brand-mark">STV</div>
            <div>
              <p>Stellar Level 3 dApp</p>
              <h1>Stellar Token dApp</h1>
            </div>
          </div>

          <button className="wallet-button" onClick={handleConnectWallet}>
            {walletAddress ? shortenAddress(walletAddress) : 'Connect Freighter'}
          </button>
        </nav>

        <div className="hero-grid">
          <div>
            <p className="eyebrow">Real Soroban transaction integration</p>
            <h2>Mint, transfer, and pay with token records on Stellar testnet.</h2>
            <p className="hero-copy">
              This upgraded Level 3 version connects Freighter, prepares Soroban transactions,
              requests wallet signatures, submits signed transactions, and reads contract state
              through Soroban RPC.
            </p>

            <div className="hero-actions">
              <a href={runtime.contractExplorerUrl} target="_blank" rel="noreferrer">
                View contract
              </a>
              <button onClick={handleStats}>Read stats</button>
            </div>
          </div>

          <article className="deployment-card">
            <p className="card-label">Deployment</p>
            <h3>{runtime.hasDeployedContract ? 'Live on testnet' : 'Not deployed'}</h3>

            <div>
              <span>Contract</span>
              <strong>{shortenAddress(runtime.contractId)}</strong>
            </div>

            <div>
              <span>Token</span>
              <strong>
                {runtime.tokenSymbol} / {runtime.tokenDecimals}
              </strong>
            </div>

            <div>
              <span>Network</span>
              <strong>{runtime.network}</strong>
            </div>
          </article>
        </div>
      </section>

      <section className="metrics-grid">
        <article>
          <p>Contract methods</p>
          <strong>{methods.length}</strong>
          <span>Frontend function matching</span>
        </article>

        <article>
          <p>Write calls</p>
          <strong>3</strong>
          <span>mint, transfer, pay</span>
        </article>

        <article>
          <p>Read calls</p>
          <strong>4</strong>
          <span>balance, summary, invoice, stats</span>
        </article>

        <article>
          <p>Wallet</p>
          <strong>{walletAddress ? 'Connected' : 'Ready'}</strong>
          <span>Freighter signTransaction</span>
        </article>
      </section>

      <section className="workspace-grid">
        <article className="panel">
          <div className="section-heading">
            <p className="eyebrow">Write transaction</p>
            <h2>Mint token</h2>
          </div>

          <label>
            Admin address
            <input value={adminAddress} onChange={(event) => setAdminAddress(event.target.value)} />
          </label>

          <label>
            Receiver address
            <input
              placeholder="G..."
              value={receiverAddress}
              onChange={(event) => setReceiverAddress(event.target.value)}
            />
          </label>

          <label>
            Amount
            <input value={amount} onChange={(event) => setAmount(event.target.value)} />
          </label>

          <button className="primary-action" onClick={handleMintToken}>
            Sign mint_token
          </button>
        </article>

        <article className="panel">
          <div className="section-heading">
            <p className="eyebrow">Write transaction</p>
            <h2>Transfer or pay</h2>
          </div>

          <label>
            Merchant address
            <input
              placeholder="G..."
              value={merchantAddress}
              onChange={(event) => setMerchantAddress(event.target.value)}
            />
          </label>

          <label>
            Memo
            <input value={memo} onChange={(event) => setMemo(event.target.value)} />
          </label>

          <div className="button-grid">
            <button onClick={handleTransferToken}>Sign transfer_token</button>
            <button onClick={handlePayInvoice}>Sign pay_invoice</button>
          </div>
        </article>
      </section>

      <section className="workspace-grid">
        <article className="panel">
          <div className="section-heading">
            <p className="eyebrow">Read contract</p>
            <h2>Queries</h2>
          </div>

          <label>
            Invoice ID
            <input
              type="number"
              min="1"
              value={invoiceId}
              onChange={(event) => setInvoiceId(Number(event.target.value || 1))}
            />
          </label>

          <div className="button-grid button-grid-four">
            <button onClick={handleBalanceOf}>Read balance_of</button>
            <button onClick={handleAccountSummary}>Read account_summary</button>
            <button onClick={handleInvoiceOf}>Read invoice_of</button>
            <button onClick={handleStats}>Read stats</button>
          </div>

          <pre>{queryResult}</pre>
        </article>

        <article className="panel">
          <div className="section-heading">
            <p className="eyebrow">Transaction monitor</p>
            <h2>Status</h2>
          </div>

          <div className="status-box">
            <p>{statusMessage}</p>

            {lastTransaction ? (
              <a href={lastTransaction.explorerUrl} target="_blank" rel="noreferrer">
                View transaction: {shortenAddress(lastTransaction.hash, 10, 10)}
              </a>
            ) : (
              <span>No transaction submitted yet.</span>
            )}
          </div>

          <div className="method-list">
            {methods.map((method) => (
              <span key={method}>{method}</span>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

export default App;