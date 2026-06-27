# Stellar Token dApp

Stellar Token dApp is a Stellar Level 3 dApp for managing a simple token vault through a Soroban smart contract, a React frontend, and Freighter wallet transaction signing.

This project was upgraded from a basic Stellar token project into a Level 3 Soroban dApp. The frontend now connects to Freighter, prepares real Soroban contract transactions, requests wallet signatures, submits signed transactions to Stellar testnet, and reads contract state through Soroban RPC.

## Live Deployment

Network: Stellar Testnet

Contract ID:

~~~text
CDMIUSBICNTNORQQPR4YEUDJT4AX4NEJXOUKGT3WEILFXTBFGRQPAK6H
~~~

Contract Explorer:

~~~text
https://stellar.expert/explorer/testnet/contract/CDMIUSBICNTNORQQPR4YEUDJT4AX4NEJXOUKGT3WEILFXTBFGRQPAK6H
~~~

## Problem

Many small token or payment demos only show a wallet connection or static contract information. They do not prove that the frontend can actually prepare, sign, submit, and read Soroban contract calls.

Stellar Token dApp solves this by providing a complete Level 3 flow: a deployed Soroban contract, real frontend wallet signing, real contract invocation, frontend tests, deployment scripts, verification scripts, and CI.

## Why Stellar

Stellar is suitable for this token vault because token transfers and small payment records need fast, low-cost, and transparent infrastructure.

- Soroban smart contracts support custom token and payment logic.
- Stellar testnet allows safe deployment without real funds.
- Freighter provides wallet access and transaction signing.
- Contract IDs and transaction history can be inspected through Stellar explorers.

## Smart Contract

The Soroban contract is located at:

~~~text
contracts/token_vault/src/lib.rs
~~~

Main contract functions:

- initialize
- token_metadata
- mint_token
- transfer_token
- pay_invoice
- balance_of
- account_summary
- invoice_of
- has_enough
- total_supply
- invoice_count
- stats

## Level 3 Features

- Rust Soroban workspace
- Real Soroban smart contract
- Persistent token account records
- Persistent invoice records
- Admin-based mint authorization
- Token transfer validation
- Invoice payment validation
- Contract tests with 7 passing scenarios
- Deployed contract on Stellar testnet
- React frontend dashboard
- Freighter wallet connect flow
- Freighter requestAccess support
- Freighter getAddress support
- Freighter signTransaction integration
- Soroban RPC integration
- TransactionBuilder usage
- prepareTransaction usage
- sendTransaction usage
- nativeToScVal and scValToNative conversion
- Frontend functions match contract methods
- Frontend tests for contract integration
- GitHub Actions CI workflow
- One-command Level 3 verification script

## Frontend Contract Integration

The frontend is not mock-only. It includes real Soroban transaction integration.

Wallet service:

- connects to Freighter
- requests wallet access
- reads wallet address
- requests transaction signing with signTransaction

Contract service:

- connects to Soroban RPC
- builds transactions with TransactionBuilder
- prepares transactions with prepareTransaction
- sends signed transactions with sendTransaction
- converts contract inputs with nativeToScVal
- converts read results with scValToNative

Frontend write functions:

- mintToken calls mint_token
- transferToken calls transfer_token
- payInvoice calls pay_invoice

Frontend read functions:

- balanceOf calls balance_of
- accountSummary calls account_summary
- invoiceOf calls invoice_of
- getStats calls stats

## Project Structure

~~~text
Stellar-token-dapp/
  contracts/
    token_vault/
      Cargo.toml
      src/
        lib.rs
        test.rs
  frontend/
    src/
      App.tsx
      App.css
      contractConfig.ts
      services/
        wallet.ts
        contract.ts
        contract.test.ts
  scripts/
    deploy-and-save.ps1
    verify-level3.ps1
  .github/workflows/ci.yml
  CONTRACT_ID.txt
  DEPLOYMENT.md
  Cargo.toml
  Cargo.lock
~~~

## Contract Tests

Run contract tests from the project root:

~~~powershell
cargo test --workspace
~~~

Current contract coverage includes:

- initializes token metadata
- admin mints token to user
- user transfers token to merchant
- user pays invoice to merchant
- rejects non-admin mint
- rejects overspending transfer
- rejects invalid payment amount

## Frontend Tests

Run frontend tests:

~~~powershell
cd frontend
npm test
~~~

Current frontend coverage includes:

- loads deployed token vault runtime config
- maps frontend functions to real contract method names
- exports real write transaction functions used by the UI
- exports real read query functions used by the UI
- shortens contract IDs and transaction hashes for dashboard display

## Build

Build Soroban contract:

~~~powershell
cargo build --workspace --target wasm32v1-none --release
~~~

Build frontend:

~~~powershell
cd frontend
npm ci
npm run build
~~~

## Deploy

Deploy the contract to Stellar testnet:

~~~powershell
.\scripts\deploy-and-save.ps1
~~~

The deployment script:

- checks required CLIs
- runs contract format check
- runs contract tests
- builds Soroban WASM
- checks only the current project identity
- deploys the token_vault contract
- initializes token metadata
- saves CONTRACT_ID.txt
- saves DEPLOYMENT.md
- updates frontend/src/contractConfig.ts

The script does not print unrelated local Stellar identities from other projects.

## Verify Level 3

Run the full verification script:

~~~powershell
.\scripts\verify-level3.ps1
~~~

This script checks:

- required Level 3 files
- deployed contract ID
- Freighter requestAccess
- Freighter getAddress
- Freighter signTransaction
- TransactionBuilder
- prepareTransaction
- sendTransaction
- nativeToScVal
- scValToNative
- frontend and contract function matching
- contract tests
- Soroban WASM build
- frontend tests
- frontend build

## CI

GitHub Actions runs:

- Rust format check
- contract tests
- Soroban WASM build
- frontend dependency install
- frontend tests
- frontend build

## Tech Stack

- Stellar Soroban
- Rust
- soroban-sdk
- React
- TypeScript
- Vite
- Vitest
- Freighter API
- Stellar SDK
- GitHub Actions

## Repository

~~~text
https://github.com/Uyen-dev-k9/Stellar-token-dapp
~~~