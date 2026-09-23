use std::collections::HashMap;
use std::io::{BufRead, Write};

use fan_economy_trust::{FanEconomyTrust, FanEconomyTrustClient, TrustError};
use soroban_sdk::testutils::{Address as _, MockAuth, MockAuthInvoke};
use soroban_sdk::{vec, Address, Bytes, BytesN, Env, IntoVal, String as SdkString, Val};

/// Local driver over the real contract `Env`.
///
/// Each command authorizes only the capability the protocol requires.
/// `authCapability` can name a different label so tests can prove that the
/// previous address, the fan, the artist, or a random address cannot perform
/// a command reserved for someone else.
///
/// The materializer label is a trusted execution capability. Authorizing it
/// proves who may lock. It does not prove that Prisma was read.
fn main() {
    let mut session = Session::new();
    let stdin = std::io::stdin();
    let mut stdout = std::io::stdout();
    for line in stdin.lock().lines() {
        let line = match line {
            Ok(line) => line,
            Err(_) => break,
        };
        if line.trim().is_empty() {
            continue;
        }
        let request: serde_json::Value = match serde_json::from_str(&line) {
            Ok(value) => value,
            Err(_) => {
                respond(&mut stdout, &err("invalid_json"));
                continue;
            }
        };
        if request["op"] == "reset" {
            session = Session::new();
            respond(&mut stdout, &ok(serde_json::json!({"reset": true})));
            continue;
        }
        respond(&mut stdout, &session.handle(&request));
    }
}

struct Capability {
    address: Address,
    label: String,
    previous_address: Option<Address>,
    previous_label: Option<String>,
}

struct Session {
    env: Env,
    contract: Address,
    registrar: Address,
    materializer: Address,
    actors: HashMap<String, Capability>,
    next_label: u32,
}

impl Session {
    fn new() -> Self {
        let env = Env::default();
        let contract = env.register(FanEconomyTrust, ());
        let registrar = Address::generate(&env);
        let materializer = Address::generate(&env);
        let client = FanEconomyTrustClient::new(&env, &contract);
        env.mock_auths(&[MockAuth {
            address: &registrar,
            invoke: &MockAuthInvoke {
                contract: &contract,
                fn_name: "init",
                args: vec![&env, registrar.clone().into_val(&env)],
                sub_invokes: &[],
            },
        }]);
        client.init(&registrar);
        env.mock_auths(&[MockAuth {
            address: &registrar,
            invoke: &MockAuthInvoke {
                contract: &contract,
                fn_name: "set_materializer",
                args: vec![&env, materializer.clone().into_val(&env)],
                sub_invokes: &[],
            },
        }]);
        client.set_materializer(&materializer);
        Self {
            env,
            contract,
            registrar,
            materializer,
            actors: HashMap::new(),
            next_label: 1,
        }
    }

    fn client(&self) -> FanEconomyTrustClient<'_> {
        FanEconomyTrustClient::new(&self.env, &self.contract)
    }

    fn authorize(&self, address: &Address, fn_name: &str, args: soroban_sdk::Vec<Val>) {
        self.env.mock_auths(&[MockAuth {
            address,
            invoke: &MockAuthInvoke {
                contract: &self.contract,
                fn_name,
                args,
                sub_invokes: &[],
            },
        }]);
    }

    fn bind(&mut self, actor_ref: &str) -> String {
        if let Some(existing) = self.actors.get(actor_ref) {
            return existing.label.clone();
        }
        let actor = self.hash_text("moc.actor.v1", actor_ref);
        let address = Address::generate(&self.env);
        let label = format!("address-{}", self.next_label);
        self.next_label += 1;
        self.authorize(
            &self.registrar,
            "bind_capability",
            vec![
                &self.env,
                actor.clone().into_val(&self.env),
                address.clone().into_val(&self.env),
            ],
        );
        self.client().bind_capability(&actor, &address);
        self.actors.insert(
            actor_ref.to_string(),
            Capability {
                address,
                label: label.clone(),
                previous_address: None,
                previous_label: None,
            },
        );
        label
    }

    fn address_by_label(&self, label: &str) -> Option<Address> {
        if label == "materializer" {
            return Some(self.materializer.clone());
        }
        for capability in self.actors.values() {
            if capability.label == label {
                return Some(capability.address.clone());
            }
            if capability.previous_label.as_deref() == Some(label) {
                return capability.previous_address.clone();
            }
        }
        None
    }

    fn current_address(&self, actor_ref: &str) -> Option<Address> {
        self.actors
            .get(actor_ref)
            .map(|capability| capability.address.clone())
    }

    fn address_for_actor_hash(&self, hash: &BytesN<32>) -> Option<Address> {
        let refs: Vec<String> = self.actors.keys().cloned().collect();
        for actor_ref in refs {
            if self.hash_text("moc.actor.v1", &actor_ref) == *hash {
                return self.current_address(&actor_ref);
            }
        }
        None
    }

    fn signer(
        &self,
        request: &serde_json::Value,
        default: &Address,
    ) -> Result<Address, serde_json::Value> {
        match request["authCapability"].as_str() {
            Some(label) => self
                .address_by_label(label)
                .ok_or_else(|| err("capability_missing")),
            None => Ok(default.clone()),
        }
    }

    fn hash_text(&self, tag: &str, value: &str) -> BytesN<32> {
        self.client().canonical_hash(
            &SdkString::from_str(&self.env, tag),
            &Bytes::from_slice(&self.env, value.as_bytes()),
        )
    }

    fn parse_i128(value: &serde_json::Value) -> Result<i128, serde_json::Value> {
        let text = value.as_str().ok_or_else(|| err("amount_required"))?;
        text.parse::<i128>().map_err(|_| err("amount_invalid"))
    }

    fn handle(&mut self, request: &serde_json::Value) -> serde_json::Value {
        let op = request["op"].as_str().unwrap_or("");
        match op {
            "bind" => {
                let actor = request["actorRef"].as_str().unwrap_or("");
                if actor.is_empty() {
                    return err("actor_required");
                }
                let label = self.bind(actor);
                let actor_hash = hex_encode(&self.hash_text("moc.actor.v1", actor).to_array());
                ok(serde_json::json!({"bound": true, "label": label, "actorHash": actor_hash}))
            }
            "capability" => {
                let actor = request["actorRef"].as_str().unwrap_or("");
                let Some(capability) = self.actors.get(actor) else {
                    return err("capability_missing");
                };
                ok(serde_json::json!({
                    "label": capability.label,
                    "previous": capability.previous_label,
                    "actorHash": hex_encode(&self.hash_text("moc.actor.v1", actor).to_array()),
                }))
            }
            "rotate" => {
                let actor_ref = request["actorRef"].as_str().unwrap_or("");
                if !self.actors.contains_key(actor_ref) {
                    return err("capability_missing");
                }
                let actor = self.hash_text("moc.actor.v1", actor_ref);
                let current = self.current_address(actor_ref).unwrap();
                let from = self.actors.get(actor_ref).unwrap().label.clone();
                let next = Address::generate(&self.env);
                let to = format!("address-{}", self.next_label);
                self.next_label += 1;
                self.authorize(
                    &current,
                    "rotate_capability",
                    vec![
                        &self.env,
                        actor.clone().into_val(&self.env),
                        next.clone().into_val(&self.env),
                    ],
                );
                match self.client().try_rotate_capability(&actor, &next) {
                    Ok(Ok(())) => {
                        let capability = self.actors.get_mut(actor_ref).unwrap();
                        capability.previous_address = Some(capability.address.clone());
                        capability.previous_label = Some(capability.label.clone());
                        capability.address = next;
                        capability.label = to.clone();
                        ok(serde_json::json!({
                            "from": from,
                            "to": to,
                            "actorHash": hex_encode(&actor.to_array()),
                        }))
                    }
                    Ok(Err(_)) => err("conversion"),
                    Err(error) => trust_err(error),
                }
            }
            "commit" => {
                let authority = request["authorityActorRef"].as_str().unwrap_or("");
                self.bind(authority);
                let amount = match Self::parse_i128(&request["amount"]) {
                    Ok(amount) => amount,
                    Err(error) => return error,
                };
                let scale = request["scale"].as_u64().unwrap_or(0) as u32;
                let campaign = self.hash_text(
                    "moc.campaign.v1",
                    request["campaignId"].as_str().unwrap_or(""),
                );
                let actor = self.hash_text("moc.actor.v1", authority);
                let asset = self.hash_text("moc.asset.v1", request["asset"].as_str().unwrap_or(""));
                let default_signer = match self.current_address(authority) {
                    Some(address) => address,
                    None => return err("capability_missing"),
                };
                let signer = match self.signer(request, &default_signer) {
                    Ok(address) => address,
                    Err(error) => return error,
                };
                self.authorize(
                    &signer,
                    "commit_reserve",
                    vec![
                        &self.env,
                        campaign.clone().into_val(&self.env),
                        actor.clone().into_val(&self.env),
                        asset.clone().into_val(&self.env),
                        scale.into_val(&self.env),
                        amount.into_val(&self.env),
                    ],
                );
                match self
                    .client()
                    .try_commit_reserve(&campaign, &actor, &asset, &scale, &amount)
                {
                    Ok(Ok(state)) => ok(campaign_json(&state)),
                    Ok(Err(_)) => err("conversion"),
                    Err(error) => trust_err(error),
                }
            }
            "authorize" => {
                let authority = request["authorityActorRef"].as_str().unwrap_or("");
                let fan = request["fanActorRef"].as_str().unwrap_or("");
                self.bind(authority);
                self.bind(fan);
                let amount = match Self::parse_i128(&request["amount"]) {
                    Ok(amount) => amount,
                    Err(error) => return error,
                };
                let grant = self.hash_text(
                    "moc.assignment.v1",
                    request["assignmentId"].as_str().unwrap_or(""),
                );
                let campaign = self.hash_text(
                    "moc.campaign.v1",
                    request["campaignId"].as_str().unwrap_or(""),
                );
                let fan_hash = self.hash_text("moc.actor.v1", fan);
                let default_signer = match self.current_address(authority) {
                    Some(address) => address,
                    None => return err("capability_missing"),
                };
                let signer = match self.signer(request, &default_signer) {
                    Ok(address) => address,
                    Err(error) => return error,
                };
                self.authorize(
                    &signer,
                    "authorize_reward",
                    vec![
                        &self.env,
                        grant.clone().into_val(&self.env),
                        campaign.clone().into_val(&self.env),
                        fan_hash.clone().into_val(&self.env),
                        amount.into_val(&self.env),
                    ],
                );
                match self
                    .client()
                    .try_authorize_reward(&grant, &campaign, &fan_hash, &amount)
                {
                    Ok(Ok(grant)) => ok(reward_json(&grant)),
                    Ok(Err(_)) => err("conversion"),
                    Err(error) => trust_err(error),
                }
            }
            "release" => {
                let fan = request["fanActorRef"].as_str().unwrap_or("");
                self.bind(fan);
                let amount = match Self::parse_i128(&request["amount"]) {
                    Ok(amount) => amount,
                    Err(error) => return error,
                };
                let grant = self.hash_text(
                    "moc.assignment.v1",
                    request["assignmentId"].as_str().unwrap_or(""),
                );
                let command = self.hash_text(
                    "moc.release-command.v1",
                    request["commandId"].as_str().unwrap_or(""),
                );
                let default_signer = match self.current_address(fan) {
                    Some(address) => address,
                    None => return err("capability_missing"),
                };
                let signer = match self.signer(request, &default_signer) {
                    Ok(address) => address,
                    Err(error) => return error,
                };
                self.authorize(
                    &signer,
                    "release_reward",
                    vec![
                        &self.env,
                        grant.clone().into_val(&self.env),
                        command.clone().into_val(&self.env),
                        amount.into_val(&self.env),
                    ],
                );
                match self.client().try_release_reward(&grant, &command, &amount) {
                    Ok(Ok(grant)) => ok(reward_json(&grant)),
                    Ok(Err(_)) => err("conversion"),
                    Err(error) => trust_err(error),
                }
            }
            "redeem" => {
                self.bind(request["fanActorRef"].as_str().unwrap_or(""));
                let amount = match Self::parse_i128(&request["amount"]) {
                    Ok(amount) => amount,
                    Err(error) => return error,
                };
                let distribution = match decode_hash(
                    &self.env,
                    request["distributionHash"].as_str().unwrap_or(""),
                ) {
                    Ok(hash) => hash,
                    Err(error) => return error,
                };
                let redemption = self.hash_text(
                    "moc.redemption.v1",
                    request["redemptionId"].as_str().unwrap_or(""),
                );
                let grant = self.hash_text(
                    "moc.assignment.v1",
                    request["assignmentId"].as_str().unwrap_or(""),
                );
                let target = self.hash_text(
                    "moc.release.v1",
                    request["releaseId"].as_str().unwrap_or(""),
                );
                let fan = request["fanActorRef"].as_str().unwrap_or("");
                let default_signer = match self.current_address(fan) {
                    Some(address) => address,
                    None => return err("capability_missing"),
                };
                let signer = match self.signer(request, &default_signer) {
                    Ok(address) => address,
                    Err(error) => return error,
                };
                self.authorize(
                    &signer,
                    "redeem",
                    vec![
                        &self.env,
                        redemption.clone().into_val(&self.env),
                        grant.clone().into_val(&self.env),
                        amount.into_val(&self.env),
                        target.clone().into_val(&self.env),
                        distribution.clone().into_val(&self.env),
                    ],
                );
                match self
                    .client()
                    .try_redeem(&redemption, &grant, &amount, &target, &distribution)
                {
                    Ok(Ok(record)) => ok(redemption_json(&record)),
                    Ok(Err(_)) => err("conversion"),
                    Err(error) => trust_err(error),
                }
            }
            "lock" => {
                let distribution = match decode_hash(
                    &self.env,
                    request["distributionHash"].as_str().unwrap_or(""),
                ) {
                    Ok(hash) => hash,
                    Err(error) => return error,
                };
                let redemption = self.hash_text(
                    "moc.redemption.v1",
                    request["redemptionId"].as_str().unwrap_or(""),
                );
                let revenue = self.hash_text(
                    "moc.revenue.v1",
                    request["revenueId"].as_str().unwrap_or(""),
                );
                let signer = match self.signer(request, &self.materializer) {
                    Ok(address) => address,
                    Err(error) => return error,
                };
                self.authorize(
                    &signer,
                    "lock_redemption",
                    vec![
                        &self.env,
                        redemption.clone().into_val(&self.env),
                        revenue.clone().into_val(&self.env),
                        distribution.clone().into_val(&self.env),
                    ],
                );
                match self
                    .client()
                    .try_lock_redemption(&redemption, &revenue, &distribution)
                {
                    Ok(Ok(record)) => ok(redemption_json(&record)),
                    Ok(Err(_)) => err("conversion"),
                    Err(error) => trust_err(error),
                }
            }
            "reverse" => {
                let redemption = self.hash_text(
                    "moc.redemption.v1",
                    request["redemptionId"].as_str().unwrap_or(""),
                );
                let Some(record) = self.client().get_redemption(&redemption) else {
                    return err("redemption_missing");
                };
                let Some(grant) = self.client().get_reward(&record.grant_id) else {
                    return err("grant_missing");
                };
                let default_signer = match self.address_for_actor_hash(&grant.actor_hash) {
                    Some(address) => address,
                    None => return err("capability_missing"),
                };
                let signer = match self.signer(request, &default_signer) {
                    Ok(address) => address,
                    Err(error) => return error,
                };
                self.authorize(
                    &signer,
                    "reverse_redemption",
                    vec![&self.env, redemption.clone().into_val(&self.env)],
                );
                match self.client().try_reverse_redemption(&redemption) {
                    Ok(Ok(record)) => ok(redemption_json(&record)),
                    Ok(Err(_)) => err("conversion"),
                    Err(error) => trust_err(error),
                }
            }
            "getCampaign" => match self.client().get_campaign_state(&self.hash_text(
                "moc.campaign.v1",
                request["campaignId"].as_str().unwrap_or(""),
            )) {
                Some(state) => ok(campaign_json(&state)),
                None => ok(serde_json::Value::Null),
            },
            "getReward" => match self.client().get_reward(&self.hash_text(
                "moc.assignment.v1",
                request["assignmentId"].as_str().unwrap_or(""),
            )) {
                Some(grant) => ok(reward_json(&grant)),
                None => ok(serde_json::Value::Null),
            },
            "getRedemption" => match self.client().get_redemption(&self.hash_text(
                "moc.redemption.v1",
                request["redemptionId"].as_str().unwrap_or(""),
            )) {
                Some(record) => ok(redemption_json(&record)),
                None => ok(serde_json::Value::Null),
            },
            _ => err("unknown_op"),
        }
    }
}

fn campaign_json(state: &fan_economy_trust::CampaignCommitment) -> serde_json::Value {
    serde_json::json!({
        "committed": state.committed.to_string(),
        "outstanding": state.outstanding.to_string(),
        "assetHash": hex_encode(&state.asset.code_hash.to_array()),
        "scale": state.asset.scale,
        "authorityActor": hex_encode(&state.authority_actor.to_array()),
    })
}

fn reward_json(grant: &fan_economy_trust::RewardGrant) -> serde_json::Value {
    serde_json::json!({
        "campaignId": hex_encode(&grant.campaign_id.to_array()),
        "actorHash": hex_encode(&grant.actor_hash.to_array()),
        "authorized": grant.authorized.to_string(),
        "consumed": grant.consumed.to_string(),
        "released": grant.released.to_string(),
    })
}

fn redemption_json(record: &fan_economy_trust::RedemptionRecord) -> serde_json::Value {
    serde_json::json!({
        "grantId": hex_encode(&record.grant_id.to_array()),
        "amount": record.amount.to_string(),
        "targetHash": hex_encode(&record.target_hash.to_array()),
        "distributionHash": hex_encode(&record.distribution_hash.to_array()),
        "status": status_name(record.status),
        "materializationHash": record.materialization_hash.as_ref().map(|hash| hex_encode(&hash.to_array())),
    })
}

fn status_name(code: u32) -> &'static str {
    match code {
        1 => "committed",
        2 => "locked",
        3 => "reversed",
        _ => "unknown",
    }
}

fn trust_err(error: Result<TrustError, impl std::fmt::Debug>) -> serde_json::Value {
    match error {
        Ok(TrustError::AmountInvalid) => err("amount_invalid"),
        Ok(TrustError::AssetMismatch) => err("asset_mismatch"),
        Ok(TrustError::CommitmentLowered) => err("commitment_lowered"),
        Ok(TrustError::BelowOutstanding) => err("below_outstanding"),
        Ok(TrustError::AboveCommitted) => err("above_committed"),
        Ok(TrustError::CampaignMissing) => err("campaign_missing"),
        Ok(TrustError::PayloadConflict) => err("payload_conflict"),
        Ok(TrustError::GrantMissing) => err("grant_missing"),
        Ok(TrustError::InsufficientRemaining) => err("insufficient_remaining"),
        Ok(TrustError::RedemptionMissing) => err("redemption_missing"),
        Ok(TrustError::NotCommitted) => err("not_committed"),
        Ok(TrustError::Locked) => err("locked"),
        Ok(TrustError::CapabilityMissing) => err("capability_missing"),
        Ok(TrustError::NotMaterializer) => err("not_materializer"),
        Ok(TrustError::AlreadyInitialized) => err("already_initialized"),
        Ok(TrustError::NotInitialized) => err("not_initialized"),
        Err(invoke) => {
            let rendered = format!("{invoke:?}");
            let lower = rendered.to_ascii_lowercase();
            if lower.contains("auth") || rendered.contains("Abort") {
                err("unauthorized")
            } else {
                err("host")
            }
        }
    }
}

fn decode_hash(env: &Env, hex: &str) -> Result<BytesN<32>, serde_json::Value> {
    let bytes = hex_decode(hex).map_err(|_| err("hash_invalid"))?;
    if bytes.len() != 32 {
        return Err(err("hash_invalid"));
    }
    let mut array = [0u8; 32];
    array.copy_from_slice(&bytes);
    Ok(BytesN::from_array(env, &array))
}

fn ok(data: serde_json::Value) -> serde_json::Value {
    serde_json::json!({"ok": true, "data": data})
}

fn err(code: &str) -> serde_json::Value {
    serde_json::json!({"ok": false, "error": code})
}

fn respond(stdout: &mut impl Write, value: &serde_json::Value) {
    writeln!(stdout, "{value}").unwrap();
    stdout.flush().unwrap();
}

fn hex_encode(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push(HEX[(byte >> 4) as usize] as char);
        out.push(HEX[(byte & 0x0f) as usize] as char);
    }
    out
}

fn hex_decode(value: &str) -> Result<Vec<u8>, ()> {
    if value.len() % 2 != 0 {
        return Err(());
    }
    let mut out = Vec::with_capacity(value.len() / 2);
    let bytes = value.as_bytes();
    let mut index = 0;
    while index < bytes.len() {
        let high = hex_nibble(bytes[index])?;
        let low = hex_nibble(bytes[index + 1])?;
        out.push((high << 4) | low);
        index += 2;
    }
    Ok(out)
}

fn hex_nibble(byte: u8) -> Result<u8, ()> {
    match byte {
        b'0'..=b'9' => Ok(byte - b'0'),
        b'a'..=b'f' => Ok(byte - b'a' + 10),
        b'A'..=b'F' => Ok(byte - b'A' + 10),
        _ => Err(()),
    }
}
