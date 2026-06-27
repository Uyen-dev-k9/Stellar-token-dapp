#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, String};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum TokenVaultError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAdmin = 3,
    InvalidAmount = 4,
    InsufficientBalance = 5,
    InvoiceNotFound = 6,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AccountData {
    pub balance: i128,
    pub minted: i128,
    pub spent: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Invoice {
    pub id: u32,
    pub payer: Address,
    pub merchant: Address,
    pub amount: i128,
    pub memo: String,
    pub paid: bool,
    pub created_ledger: u32,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    TokenName,
    TokenSymbol,
    TokenDecimals,
    TotalSupply,
    InvoiceCount,
    Account(Address),
    Invoice(u32),
}

#[contract]
pub struct TokenVaultContract;

#[contractimpl]
impl TokenVaultContract {
    pub fn initialize(
        env: Env,
        admin: Address,
        name: String,
        symbol: String,
        decimals: u32,
    ) -> bool {
        admin.require_auth();

        if env.storage().persistent().has(&DataKey::Admin) {
            env.panic_with_error(TokenVaultError::AlreadyInitialized);
        }

        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::TokenName, &name);
        env.storage()
            .persistent()
            .set(&DataKey::TokenSymbol, &symbol);
        env.storage()
            .persistent()
            .set(&DataKey::TokenDecimals, &decimals);
        env.storage()
            .persistent()
            .set(&DataKey::TotalSupply, &0i128);
        env.storage()
            .persistent()
            .set(&DataKey::InvoiceCount, &0u32);

        true
    }

    pub fn token_metadata(env: Env) -> (String, String, u32, Address) {
        (
            Self::read_name(&env),
            Self::read_symbol(&env),
            Self::read_decimals(&env),
            Self::read_admin(&env),
        )
    }

    pub fn mint_token(env: Env, admin: Address, to: Address, amount: i128) -> i128 {
        admin.require_auth();

        Self::require_admin(&env, &admin);
        Self::require_positive_amount(&env, amount);

        let mut account = Self::read_account(&env, to.clone());
        account.balance += amount;
        account.minted += amount;

        env.storage()
            .persistent()
            .set(&DataKey::Account(to), &account);

        let total_supply = Self::total_supply(env.clone()) + amount;
        env.storage()
            .persistent()
            .set(&DataKey::TotalSupply, &total_supply);

        total_supply
    }

    pub fn transfer_token(env: Env, from: Address, to: Address, amount: i128) -> bool {
        from.require_auth();

        Self::require_positive_amount(&env, amount);

        let mut sender = Self::read_account(&env, from.clone());

        if sender.balance < amount {
            env.panic_with_error(TokenVaultError::InsufficientBalance);
        }

        let mut receiver = Self::read_account(&env, to.clone());

        sender.balance -= amount;
        sender.spent += amount;
        receiver.balance += amount;

        env.storage()
            .persistent()
            .set(&DataKey::Account(from), &sender);
        env.storage()
            .persistent()
            .set(&DataKey::Account(to), &receiver);

        true
    }

    pub fn pay_invoice(
        env: Env,
        payer: Address,
        merchant: Address,
        amount: i128,
        memo: String,
    ) -> u32 {
        payer.require_auth();

        Self::require_positive_amount(&env, amount);

        let mut payer_data = Self::read_account(&env, payer.clone());

        if payer_data.balance < amount {
            env.panic_with_error(TokenVaultError::InsufficientBalance);
        }

        let mut merchant_data = Self::read_account(&env, merchant.clone());

        payer_data.balance -= amount;
        payer_data.spent += amount;
        merchant_data.balance += amount;

        env.storage()
            .persistent()
            .set(&DataKey::Account(payer.clone()), &payer_data);
        env.storage()
            .persistent()
            .set(&DataKey::Account(merchant.clone()), &merchant_data);

        let invoice_id = Self::invoice_count(env.clone()) + 1;

        let invoice = Invoice {
            id: invoice_id,
            payer,
            merchant,
            amount,
            memo,
            paid: true,
            created_ledger: env.ledger().sequence(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Invoice(invoice_id), &invoice);
        env.storage()
            .persistent()
            .set(&DataKey::InvoiceCount, &invoice_id);

        invoice_id
    }

    pub fn balance_of(env: Env, account: Address) -> i128 {
        Self::read_account(&env, account).balance
    }

    pub fn account_summary(env: Env, account: Address) -> AccountData {
        Self::read_account(&env, account)
    }

    pub fn invoice_of(env: Env, invoice_id: u32) -> Invoice {
        let invoice: Option<Invoice> = env
            .storage()
            .persistent()
            .get(&DataKey::Invoice(invoice_id));

        match invoice {
            Some(value) => value,
            None => env.panic_with_error(TokenVaultError::InvoiceNotFound),
        }
    }

    pub fn has_enough(env: Env, account: Address, amount: i128) -> bool {
        Self::read_account(&env, account).balance >= amount
    }

    pub fn total_supply(env: Env) -> i128 {
        let value: Option<i128> = env.storage().persistent().get(&DataKey::TotalSupply);
        value.unwrap_or(0)
    }

    pub fn invoice_count(env: Env) -> u32 {
        let value: Option<u32> = env.storage().persistent().get(&DataKey::InvoiceCount);
        value.unwrap_or(0)
    }

    pub fn stats(env: Env) -> (i128, u32) {
        (Self::total_supply(env.clone()), Self::invoice_count(env))
    }

    fn read_admin(env: &Env) -> Address {
        let value: Option<Address> = env.storage().persistent().get(&DataKey::Admin);

        match value {
            Some(admin) => admin,
            None => env.panic_with_error(TokenVaultError::NotInitialized),
        }
    }

    fn read_name(env: &Env) -> String {
        let value: Option<String> = env.storage().persistent().get(&DataKey::TokenName);

        match value {
            Some(name) => name,
            None => env.panic_with_error(TokenVaultError::NotInitialized),
        }
    }

    fn read_symbol(env: &Env) -> String {
        let value: Option<String> = env.storage().persistent().get(&DataKey::TokenSymbol);

        match value {
            Some(symbol) => symbol,
            None => env.panic_with_error(TokenVaultError::NotInitialized),
        }
    }

    fn read_decimals(env: &Env) -> u32 {
        let value: Option<u32> = env.storage().persistent().get(&DataKey::TokenDecimals);

        match value {
            Some(decimals) => decimals,
            None => env.panic_with_error(TokenVaultError::NotInitialized),
        }
    }

    fn read_account(env: &Env, account: Address) -> AccountData {
        let value: Option<AccountData> = env.storage().persistent().get(&DataKey::Account(account));

        value.unwrap_or(AccountData {
            balance: 0,
            minted: 0,
            spent: 0,
        })
    }

    fn require_admin(env: &Env, caller: &Address) {
        let admin = Self::read_admin(env);

        if admin != *caller {
            env.panic_with_error(TokenVaultError::NotAdmin);
        }
    }

    fn require_positive_amount(env: &Env, amount: i128) {
        if amount <= 0 {
            env.panic_with_error(TokenVaultError::InvalidAmount);
        }
    }
}

#[cfg(test)]
mod test;
