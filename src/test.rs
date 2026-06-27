#![cfg(test)]

use super::*;
use soroban_sdk::{Env, Address};

#[test]
fn test_pay_flow() {
    let env = Env::default();

    // tạo user & restaurant
    let user = Address::generate(&env);
    let restaurant = Address::generate(&env);

    // register contract
    let token_id = env.register_contract(None, soroban_token_contract::Token);
    let token_client = soroban_token_contract::TokenClient::new(&env, &token_id);

    // init token
    token_client.initialize(&user, &7, &"TestToken".into(), &"TT".into());

    // mint cho user
    token_client.mint(&user, &1000);

    // register restaurant contract
    let restaurant_id = env.register_contract(None, RestaurantContract);
    let restaurant_client = RestaurantContractClient::new(&env, &restaurant_id);

    // CALL PAY
    restaurant_client.pay(&user, &token_id, &200);

    // CHECK balance user giảm
    let user_balance = token_client.balance(&user);
    assert_eq!(user_balance, 800);

    // CHECK balance restaurant tăng
    let restaurant_balance = token_client.balance(&restaurant_id);
    assert_eq!(restaurant_balance, 200);
}