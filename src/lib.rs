#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env,
};

#[contracttype]
pub enum DataKey {
    Admin,
    LocalToken,
}

#[contract]
pub struct RestaurantContract;

#[contractimpl]
impl RestaurantContract {
    pub fn init(env: Env, admin: Address, token: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::LocalToken, &token);
    }

    pub fn pay(env: Env, from: Address, token: Address, amount: i128) {
        from.require_auth();

        let local_token: Address = env
            .storage()
            .instance()
            .get(&DataKey::LocalToken)
            .unwrap();

        if token != local_token {
            panic!("Only local token accepted");
        }

        let client = soroban_sdk::token::Client::new(&env, &token);

        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap();

        client.transfer(&from, &admin, &amount);

        env.events().publish(("PAY", from), amount);
    }
}