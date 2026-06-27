use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup<'a>(env: &'a Env) -> (TokenVaultContractClient<'a>, Address, Address, Address) {
    env.mock_all_auths();

    let contract_id = env.register(TokenVaultContract, ());
    let client = TokenVaultContractClient::new(env, &contract_id);

    let admin = Address::generate(env);
    let user = Address::generate(env);
    let merchant = Address::generate(env);

    client.initialize(
        &admin,
        &String::from_str(env, "Stellar Token Vault"),
        &String::from_str(env, "STV"),
        &7,
    );

    (client, admin, user, merchant)
}

#[test]
fn initializes_token_metadata() {
    let env = Env::default();
    let (client, admin, _user, _merchant) = setup(&env);

    let metadata = client.token_metadata();

    assert_eq!(metadata.0, String::from_str(&env, "Stellar Token Vault"));
    assert_eq!(metadata.1, String::from_str(&env, "STV"));
    assert_eq!(metadata.2, 7);
    assert_eq!(metadata.3, admin);
    assert_eq!(client.stats(), (0, 0));
}

#[test]
fn admin_mints_token_to_user() {
    let env = Env::default();
    let (client, admin, user, _merchant) = setup(&env);

    let total_supply = client.mint_token(&admin, &user, &1_000);

    assert_eq!(total_supply, 1_000);
    assert_eq!(client.balance_of(&user), 1_000);

    let summary = client.account_summary(&user);
    assert_eq!(summary.balance, 1_000);
    assert_eq!(summary.minted, 1_000);
    assert_eq!(summary.spent, 0);
}

#[test]
fn user_transfers_token_to_merchant() {
    let env = Env::default();
    let (client, admin, user, merchant) = setup(&env);

    client.mint_token(&admin, &user, &1_000);
    client.transfer_token(&user, &merchant, &250);

    assert_eq!(client.balance_of(&user), 750);
    assert_eq!(client.balance_of(&merchant), 250);
    assert_eq!(client.has_enough(&user, &700), true);
    assert_eq!(client.has_enough(&user, &800), false);
}

#[test]
fn user_pays_invoice_to_merchant() {
    let env = Env::default();
    let (client, admin, user, merchant) = setup(&env);

    client.mint_token(&admin, &user, &2_000);

    let invoice_id = client.pay_invoice(
        &user,
        &merchant,
        &600,
        &String::from_str(&env, "Course payment"),
    );

    let invoice = client.invoice_of(&invoice_id);

    assert_eq!(invoice_id, 1);
    assert_eq!(invoice.id, 1);
    assert_eq!(invoice.payer, user);
    assert_eq!(invoice.merchant, merchant);
    assert_eq!(invoice.amount, 600);
    assert_eq!(invoice.paid, true);
    assert_eq!(client.balance_of(&user), 1_400);
    assert_eq!(client.balance_of(&merchant), 600);
    assert_eq!(client.stats(), (2_000, 1));
}

#[test]
#[should_panic]
fn rejects_non_admin_mint() {
    let env = Env::default();
    let (client, _admin, user, merchant) = setup(&env);

    client.mint_token(&user, &merchant, &100);
}

#[test]
#[should_panic]
fn rejects_overspending_transfer() {
    let env = Env::default();
    let (client, admin, user, merchant) = setup(&env);

    client.mint_token(&admin, &user, &100);
    client.transfer_token(&user, &merchant, &150);
}

#[test]
#[should_panic]
fn rejects_invalid_payment_amount() {
    let env = Env::default();
    let (client, admin, user, merchant) = setup(&env);

    client.mint_token(&admin, &user, &100);
    client.pay_invoice(&user, &merchant, &0, &String::from_str(&env, "Invalid"));
}
