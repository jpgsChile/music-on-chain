use fan_economy_trust::{FanEconomyTrust, FanEconomyTrustClient, TrustError};
use soroban_sdk::testutils::{Address as _, Events, MockAuth, MockAuthInvoke};
use soroban_sdk::{vec, Address, Bytes, BytesN, Env, IntoVal, String};

fn id(env: &Env, n: u8) -> BytesN<32> {
    let mut bytes = [0u8; 32];
    bytes[31] = n;
    BytesN::from_array(env, &bytes)
}

struct World {
    env: Env,
    contract: Address,
    materializer: Address,
    artist_addr: Address,
    fan_addr: Address,
    other_addr: Address,
}

impl World {
    fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();
        let contract = env.register(FanEconomyTrust, ());
        let client = FanEconomyTrustClient::new(&env, &contract);
        let registrar = Address::generate(&env);
        let materializer = Address::generate(&env);
        client.init(&registrar);
        client.set_materializer(&materializer);
        let artist_addr = Address::generate(&env);
        let fan_addr = Address::generate(&env);
        let other_addr = Address::generate(&env);
        client.bind_capability(&id(&env, 1), &artist_addr);
        client.bind_capability(&id(&env, 2), &fan_addr);
        Self {
            env,
            contract,
            materializer,
            artist_addr,
            fan_addr,
            other_addr,
        }
    }

    fn client(&self) -> FanEconomyTrustClient<'_> {
        FanEconomyTrustClient::new(&self.env, &self.contract)
    }

    fn fund(&self, amount: i128) {
        self.client().commit_reserve(
            &id(&self.env, 10),
            &id(&self.env, 1),
            &id(&self.env, 20),
            &6,
            &amount,
        );
    }

    fn grant(&self, amount: i128) {
        self.client().authorize_reward(
            &id(&self.env, 30),
            &id(&self.env, 10),
            &id(&self.env, 2),
            &amount,
        );
    }
}

fn remaining(grant: &fan_economy_trust::RewardGrant) -> i128 {
    grant.authorized - grant.consumed - grant.released
}

#[test]
fn reserve_creation_and_identical_command_is_idempotent() {
    let world = World::new();
    let before = world.env.events().all().events().len();
    world.fund(1_000);
    assert!(world.env.events().all().events().len() > before);
    let state = world
        .client()
        .get_campaign_state(&id(&world.env, 10))
        .unwrap();
    assert_eq!(state.committed, 1_000);
    assert_eq!(state.outstanding, 0);
    world.fund(1_000);
    let again = world
        .client()
        .get_campaign_state(&id(&world.env, 10))
        .unwrap();
    assert_eq!(again, state);
}

#[test]
fn cannot_lower_commitment_or_authorize_above_it() {
    let world = World::new();
    world.fund(100);
    let lowered = world.client().try_commit_reserve(
        &id(&world.env, 10),
        &id(&world.env, 1),
        &id(&world.env, 20),
        &6,
        &50,
    );
    assert_eq!(lowered, Err(Ok(TrustError::CommitmentLowered)));
    let over = world.client().try_authorize_reward(
        &id(&world.env, 30),
        &id(&world.env, 10),
        &id(&world.env, 2),
        &101,
    );
    assert_eq!(over, Err(Ok(TrustError::AboveCommitted)));
}

#[test]
fn grant_is_unique_and_replays_only_the_same_payload() {
    let world = World::new();
    world.fund(100);
    world.grant(40);
    world.grant(40);
    let campaign = world
        .client()
        .get_campaign_state(&id(&world.env, 10))
        .unwrap();
    assert_eq!(campaign.outstanding, 40);
    let conflict = world.client().try_authorize_reward(
        &id(&world.env, 30),
        &id(&world.env, 10),
        &id(&world.env, 2),
        &41,
    );
    assert_eq!(conflict, Err(Ok(TrustError::PayloadConflict)));
}

#[test]
fn release_reduces_remaining_and_outstanding_and_blocks_redeem() {
    let world = World::new();
    world.fund(100);
    world.grant(40);
    world
        .client()
        .release_reward(&id(&world.env, 30), &id(&world.env, 40), &15);
    world
        .client()
        .release_reward(&id(&world.env, 30), &id(&world.env, 40), &15);
    let grant = world.client().get_reward(&id(&world.env, 30)).unwrap();
    assert_eq!(grant.released, 15);
    assert_eq!(grant.consumed, 0);
    assert_eq!(remaining(&grant), 25);
    let campaign = world
        .client()
        .get_campaign_state(&id(&world.env, 10))
        .unwrap();
    assert_eq!(campaign.outstanding, 25);
    world
        .client()
        .release_reward(&id(&world.env, 30), &id(&world.env, 41), &25);
    let blocked = world.client().try_redeem(
        &id(&world.env, 50),
        &id(&world.env, 30),
        &1,
        &id(&world.env, 60),
        &id(&world.env, 70),
    );
    assert_eq!(blocked, Err(Ok(TrustError::InsufficientRemaining)));
}

#[test]
fn redeem_consumes_without_freeing_outstanding_and_rejects_replay_conflicts() {
    let world = World::new();
    world.fund(100);
    world.grant(40);
    let target = id(&world.env, 60);
    let distribution = id(&world.env, 70);
    world.client().redeem(
        &id(&world.env, 50),
        &id(&world.env, 30),
        &10,
        &target,
        &distribution,
    );
    world.client().redeem(
        &id(&world.env, 50),
        &id(&world.env, 30),
        &10,
        &target,
        &distribution,
    );
    let grant = world.client().get_reward(&id(&world.env, 30)).unwrap();
    assert_eq!(grant.consumed, 10);
    assert_eq!(remaining(&grant), 30);
    let campaign = world
        .client()
        .get_campaign_state(&id(&world.env, 10))
        .unwrap();
    assert_eq!(campaign.outstanding, 40);
    let record = world.client().get_redemption(&id(&world.env, 50)).unwrap();
    assert_eq!(record.amount, 10);
    assert_eq!(record.status, 1);
    assert_eq!(record.target_hash, target);
    assert_eq!(record.distribution_hash, distribution);
    let conflict = world.client().try_redeem(
        &id(&world.env, 50),
        &id(&world.env, 30),
        &11,
        &target,
        &distribution,
    );
    assert_eq!(conflict, Err(Ok(TrustError::PayloadConflict)));
}

#[test]
fn release_and_lock_require_the_owning_capability() {
    let world = World::new();
    world.fund(100);
    world.grant(40);
    world
        .client()
        .release_reward(&id(&world.env, 30), &id(&world.env, 40), &1);
    let auths = world.env.auths();
    assert_eq!(auths[0].0, world.fan_addr);
    assert_ne!(auths[0].0, world.artist_addr);

    world.env.set_auths(&[]);
    let args = vec![
        &world.env,
        id(&world.env, 30).into_val(&world.env),
        id(&world.env, 42).into_val(&world.env),
        1i128.into_val(&world.env),
    ];
    world.env.mock_auths(&[MockAuth {
        address: &world.artist_addr,
        invoke: &MockAuthInvoke {
            contract: &world.contract,
            fn_name: "release_reward",
            args: args.clone(),
            sub_invokes: &[],
        },
    }]);
    let clawback = world
        .client()
        .try_release_reward(&id(&world.env, 30), &id(&world.env, 42), &1);
    assert!(clawback.is_err());

    world.env.mock_auths(&[MockAuth {
        address: &world.other_addr,
        invoke: &MockAuthInvoke {
            contract: &world.contract,
            fn_name: "release_reward",
            args,
            sub_invokes: &[],
        },
    }]);
    let other = world
        .client()
        .try_release_reward(&id(&world.env, 30), &id(&world.env, 42), &1);
    assert!(other.is_err());
    let grant = world.client().get_reward(&id(&world.env, 30)).unwrap();
    assert_eq!(grant.actor_hash, id(&world.env, 2));
    assert_eq!(grant.released, 1);
}

#[test]
fn reverse_committed_redemption_and_refuse_locked() {
    let world = World::new();
    world.fund(100);
    world.grant(40);
    let distribution = id(&world.env, 70);
    world.client().redeem(
        &id(&world.env, 50),
        &id(&world.env, 30),
        &10,
        &id(&world.env, 60),
        &distribution,
    );
    world.client().reverse_redemption(&id(&world.env, 50));
    world.client().reverse_redemption(&id(&world.env, 50));
    let grant = world.client().get_reward(&id(&world.env, 30)).unwrap();
    assert_eq!(grant.consumed, 0);
    assert_eq!(grant.released, 0);
    let campaign = world
        .client()
        .get_campaign_state(&id(&world.env, 10))
        .unwrap();
    assert_eq!(campaign.outstanding, 40);
    assert_eq!(
        world
            .client()
            .get_redemption(&id(&world.env, 50))
            .unwrap()
            .status,
        3
    );

    world.client().redeem(
        &id(&world.env, 51),
        &id(&world.env, 30),
        &10,
        &id(&world.env, 60),
        &distribution,
    );
    let revenue = id(&world.env, 80);
    world
        .client()
        .lock_redemption(&id(&world.env, 51), &revenue, &distribution);
    let locked = world.client().get_redemption(&id(&world.env, 51)).unwrap();
    assert_eq!(locked.status, 2);
    assert_eq!(locked.amount, 10);
    assert!(locked.materialization_hash.is_some());
    let refused = world.client().try_reverse_redemption(&id(&world.env, 51));
    assert_eq!(refused, Err(Ok(TrustError::Locked)));
    assert_eq!(
        world
            .client()
            .get_reward(&id(&world.env, 30))
            .unwrap()
            .consumed,
        10
    );
}

#[test]
fn lock_keeps_payload_and_rejects_a_stranger() {
    let world = World::new();
    world.fund(100);
    world.grant(40);
    let distribution = id(&world.env, 70);
    let target = id(&world.env, 60);
    world.client().redeem(
        &id(&world.env, 50),
        &id(&world.env, 30),
        &10,
        &target,
        &distribution,
    );
    let changed = world.client().try_lock_redemption(
        &id(&world.env, 50),
        &id(&world.env, 80),
        &id(&world.env, 71),
    );
    assert_eq!(changed, Err(Ok(TrustError::PayloadConflict)));
    let record = world.client().get_redemption(&id(&world.env, 50)).unwrap();
    assert_eq!(record.amount, 10);
    assert_eq!(record.target_hash, target);
    assert_eq!(record.distribution_hash, distribution);
    assert_eq!(record.status, 1);

    world.env.set_auths(&[]);
    let args = vec![
        &world.env,
        id(&world.env, 50).into_val(&world.env),
        id(&world.env, 80).into_val(&world.env),
        distribution.into_val(&world.env),
    ];
    world.env.mock_auths(&[MockAuth {
        address: &world.other_addr,
        invoke: &MockAuthInvoke {
            contract: &world.contract,
            fn_name: "lock_redemption",
            args: args.clone(),
            sub_invokes: &[],
        },
    }]);
    assert!(world
        .client()
        .try_lock_redemption(&id(&world.env, 50), &id(&world.env, 80), &distribution)
        .is_err());
    world.env.mock_auths(&[MockAuth {
        address: &world.materializer,
        invoke: &MockAuthInvoke {
            contract: &world.contract,
            fn_name: "lock_redemption",
            args,
            sub_invokes: &[],
        },
    }]);
    let locked =
        world
            .client()
            .lock_redemption(&id(&world.env, 50), &id(&world.env, 80), &distribution);
    assert_eq!(locked.status, 2);
    assert_eq!(locked.amount, 10);
    assert_eq!(locked.target_hash, target);
    assert_eq!(locked.distribution_hash, distribution);
}

#[test]
fn capability_rotation_does_not_move_grant_ownership() {
    let world = World::new();
    world.fund(100);
    world.grant(40);
    let next = Address::generate(&world.env);
    world.env.set_auths(&[]);
    let rotate_args = vec![
        &world.env,
        id(&world.env, 2).into_val(&world.env),
        next.clone().into_val(&world.env),
    ];
    world.env.mock_auths(&[MockAuth {
        address: &world.fan_addr,
        invoke: &MockAuthInvoke {
            contract: &world.contract,
            fn_name: "rotate_capability",
            args: rotate_args,
            sub_invokes: &[],
        },
    }]);
    world.client().rotate_capability(&id(&world.env, 2), &next);
    assert_eq!(
        world
            .client()
            .get_actor_capability(&id(&world.env, 2))
            .unwrap(),
        next
    );
    assert_eq!(
        world
            .client()
            .get_reward(&id(&world.env, 30))
            .unwrap()
            .actor_hash,
        id(&world.env, 2)
    );
    let release_args = vec![
        &world.env,
        id(&world.env, 30).into_val(&world.env),
        id(&world.env, 40).into_val(&world.env),
        4i128.into_val(&world.env),
    ];
    world.env.mock_auths(&[MockAuth {
        address: &next,
        invoke: &MockAuthInvoke {
            contract: &world.contract,
            fn_name: "release_reward",
            args: release_args,
            sub_invokes: &[],
        },
    }]);
    world
        .client()
        .release_reward(&id(&world.env, 30), &id(&world.env, 40), &4);
    let old_args = vec![
        &world.env,
        id(&world.env, 30).into_val(&world.env),
        id(&world.env, 41).into_val(&world.env),
        1i128.into_val(&world.env),
    ];
    world.env.mock_auths(&[MockAuth {
        address: &world.fan_addr,
        invoke: &MockAuthInvoke {
            contract: &world.contract,
            fn_name: "release_reward",
            args: old_args,
            sub_invokes: &[],
        },
    }]);
    assert!(world
        .client()
        .try_release_reward(&id(&world.env, 30), &id(&world.env, 41), &1)
        .is_err());
    assert_eq!(
        world
            .client()
            .get_reward(&id(&world.env, 30))
            .unwrap()
            .released,
        4
    );
}

#[test]
fn canonical_vectors_match_typescript() {
    let env = Env::default();
    let contract = env.register(FanEconomyTrust, ());
    let client = FanEconomyTrustClient::new(&env, &contract);
    let file = include_str!("../vectors.json");
    let vectors: serde_json::Value = serde_json::from_str(file).unwrap();

    for key in [
        "actor",
        "campaign",
        "assignment",
        "redemption",
        "release",
        "asset",
        "revenue",
        "command",
    ] {
        let row = &vectors[key];
        let tag = row["tag"].as_str().unwrap();
        let input = row["input"].as_str().unwrap();
        let expected = decode_hex(row["hash"].as_str().unwrap());
        let hashed = client.canonical_hash(
            &String::from_str(&env, tag),
            &Bytes::from_slice(&env, input.as_bytes()),
        );
        assert_eq!(hashed.to_array(), expected, "{key}");
    }

    let distribution = &vectors["distribution"];
    let mut rows: Vec<([u8; 32], u32)> = distribution["entries"]
        .as_array()
        .unwrap()
        .iter()
        .map(|entry| {
            let actor = entry["actorRef"].as_str().unwrap();
            let hash = client.canonical_hash(
                &String::from_str(&env, "moc.actor.v1"),
                &Bytes::from_slice(&env, actor.as_bytes()),
            );
            (hash.to_array(), entry["shareBps"].as_u64().unwrap() as u32)
        })
        .collect();
    rows.sort_by(|a, b| a.0.cmp(&b.0).then(a.1.cmp(&b.1)));
    let mut entries = soroban_sdk::Vec::new(&env);
    for (hash, bps) in rows {
        entries.push_back((BytesN::from_array(&env, &hash), bps));
    }
    let got = client.distribution_commitment(&entries);
    assert_eq!(
        got.to_array(),
        decode_hex(distribution["hash"].as_str().unwrap())
    );

    let material = &vectors["materialization"];
    let redemption = client.canonical_hash(
        &String::from_str(&env, "moc.redemption.v1"),
        &Bytes::from_slice(&env, material["redemptionId"].as_str().unwrap().as_bytes()),
    );
    let revenue = client.canonical_hash(
        &String::from_str(&env, "moc.revenue.v1"),
        &Bytes::from_slice(&env, material["revenueId"].as_str().unwrap().as_bytes()),
    );
    let commitment = client.hash_materialization(&redemption, &revenue, &got);
    assert_eq!(
        commitment.to_array(),
        decode_hex(material["hash"].as_str().unwrap())
    );
}

fn decode_hex(value: &str) -> [u8; 32] {
    let bytes = hex::decode(value).unwrap();
    bytes.try_into().unwrap()
}
