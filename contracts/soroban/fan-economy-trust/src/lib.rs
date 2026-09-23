//! Trust execution for Fan Economy.
//!
//! `ActorHash` identifies a Fan or Artist. A Stellar address only authorizes
//! commands for that hash and can be rotated. The address does not own a grant.
//!
//! `commit_reserve` is an accounting commitment. It does not custody tokens
//! and it is not proof that assets are reserved.
//!
//! `lock_redemption` records that a configured materializer wrote this exact
//! redemption into the economic kernel. The contract does not read that kernel.
#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, Bytes, BytesN,
    Env, String, Vec,
};

/// Protocol accounting for Fan Economy. Not a token, not settlement, not custody.
#[contract]
pub struct FanEconomyTrust;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum TrustError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    AmountInvalid = 3,
    AssetMismatch = 4,
    CommitmentLowered = 5,
    BelowOutstanding = 6,
    AboveCommitted = 7,
    CampaignMissing = 8,
    PayloadConflict = 9,
    GrantMissing = 10,
    InsufficientRemaining = 11,
    RedemptionMissing = 12,
    NotCommitted = 13,
    Locked = 14,
    CapabilityMissing = 15,
    NotMaterializer = 16,
}

const COMMITTED: u32 = 1;
const LOCKED: u32 = 2;
const REVERSED: u32 = 3;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Registrar,
    Materializer,
    Capability(BytesN<32>),
    Campaign(BytesN<32>),
    Grant(BytesN<32>),
    Redemption(BytesN<32>),
    ReleaseCommand(BytesN<32>),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetRef {
    pub code_hash: BytesN<32>,
    pub scale: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CampaignCommitment {
    pub authority_actor: BytesN<32>,
    pub asset: AssetRef,
    pub committed: i128,
    pub outstanding: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RewardGrant {
    pub campaign_id: BytesN<32>,
    pub actor_hash: BytesN<32>,
    pub authorized: i128,
    pub consumed: i128,
    pub released: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RedemptionRecord {
    pub grant_id: BytesN<32>,
    pub amount: i128,
    pub target_hash: BytesN<32>,
    pub distribution_hash: BytesN<32>,
    pub status: u32,
    pub materialization_hash: Option<BytesN<32>>,
}

fn positive(amount: i128) -> Result<(), TrustError> {
    if amount <= 0 {
        Err(TrustError::AmountInvalid)
    } else {
        Ok(())
    }
}

fn bump(env: &Env, key: &DataKey) {
    env.storage().persistent().extend_ttl(key, 200, 500_000);
}

fn put<T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>>(env: &Env, key: &DataKey, value: &T) {
    env.storage().persistent().set(key, value);
    bump(env, key);
}

fn capability(env: &Env, actor: &BytesN<32>) -> Result<Address, TrustError> {
    env.storage()
        .persistent()
        .get(&DataKey::Capability(actor.clone()))
        .ok_or(TrustError::CapabilityMissing)
}

fn require_actor(env: &Env, actor: &BytesN<32>) -> Result<(), TrustError> {
    capability(env, actor)?.require_auth();
    Ok(())
}

fn tagged_bytes(env: &Env, tag: &Bytes, body: &Bytes) -> BytesN<32> {
    let mut buf = Bytes::new(env);
    buf.extend_from_slice(&tag.len().to_be_bytes());
    buf.append(tag);
    buf.append(body);
    env.crypto().sha256(&buf).to_bytes()
}

fn tagged(env: &Env, tag: &str, body: &Bytes) -> BytesN<32> {
    tagged_bytes(env, &Bytes::from_slice(env, tag.as_bytes()), body)
}

fn materialization_commitment(
    env: &Env,
    redemption_id: &BytesN<32>,
    revenue_hash: &BytesN<32>,
    distribution_hash: &BytesN<32>,
) -> BytesN<32> {
    let mut body = Bytes::new(env);
    body.append(&redemption_id.to_bytes());
    body.append(&revenue_hash.to_bytes());
    body.append(&distribution_hash.to_bytes());
    tagged(env, "moc.materialization.v1", &body)
}

fn release_slot(env: &Env, grant_id: &BytesN<32>, command_id: &BytesN<32>) -> BytesN<32> {
    let mut body = Bytes::new(env);
    body.append(&grant_id.to_bytes());
    body.append(&command_id.to_bytes());
    tagged(env, "moc.release-slot.v1", &body)
}

#[contractevent(topics = ["ReserveCommitted"])]
struct ReserveCommitted {
    #[topic]
    id: BytesN<32>,
    committed: i128,
    outstanding: i128,
}

#[contractevent(topics = ["RewardAuthorized"])]
struct RewardAuthorized {
    #[topic]
    id: BytesN<32>,
    amount: i128,
}

#[contractevent(topics = ["RewardReleased"])]
struct RewardReleased {
    #[topic]
    id: BytesN<32>,
    amount: i128,
}

#[contractevent(topics = ["RedemptionCommitted"])]
struct RedemptionCommitted {
    #[topic]
    id: BytesN<32>,
    amount: i128,
}

#[contractevent(topics = ["RedemptionLocked"])]
struct RedemptionLocked {
    #[topic]
    id: BytesN<32>,
    amount: i128,
}

#[contractevent(topics = ["RedemptionReversed"])]
struct RedemptionReversed {
    #[topic]
    id: BytesN<32>,
    amount: i128,
}

#[contractimpl]
impl FanEconomyTrust {
    pub fn init(env: Env, registrar: Address) -> Result<(), TrustError> {
        if env.storage().instance().has(&DataKey::Registrar) {
            return Err(TrustError::AlreadyInitialized);
        }
        registrar.require_auth();
        env.storage()
            .instance()
            .set(&DataKey::Registrar, &registrar);
        Ok(())
    }

    pub fn set_materializer(env: Env, materializer: Address) -> Result<(), TrustError> {
        let registrar: Address = env
            .storage()
            .instance()
            .get(&DataKey::Registrar)
            .ok_or(TrustError::NotInitialized)?;
        registrar.require_auth();
        env.storage()
            .instance()
            .set(&DataKey::Materializer, &materializer);
        Ok(())
    }

    pub fn bind_capability(
        env: Env,
        actor: BytesN<32>,
        capability: Address,
    ) -> Result<(), TrustError> {
        let registrar: Address = env
            .storage()
            .instance()
            .get(&DataKey::Registrar)
            .ok_or(TrustError::NotInitialized)?;
        registrar.require_auth();
        put(&env, &DataKey::Capability(actor), &capability);
        Ok(())
    }

    /// Current capability rotates the address. ActorHash ownership does not move.
    pub fn rotate_capability(env: Env, actor: BytesN<32>, next: Address) -> Result<(), TrustError> {
        let current = capability(&env, &actor)?;
        current.require_auth();
        put(&env, &DataKey::Capability(actor), &next);
        Ok(())
    }

    pub fn commit_reserve(
        env: Env,
        campaign_id: BytesN<32>,
        authority_actor: BytesN<32>,
        asset_code_hash: BytesN<32>,
        scale: u32,
        amount: i128,
    ) -> Result<CampaignCommitment, TrustError> {
        positive(amount)?;
        require_actor(&env, &authority_actor)?;
        let key = DataKey::Campaign(campaign_id.clone());
        if let Some(existing) = env
            .storage()
            .persistent()
            .get::<_, CampaignCommitment>(&key)
        {
            if existing.authority_actor != authority_actor {
                return Err(TrustError::PayloadConflict);
            }
            if existing.asset.code_hash != asset_code_hash || existing.asset.scale != scale {
                return Err(TrustError::AssetMismatch);
            }
            if amount < existing.outstanding {
                return Err(TrustError::BelowOutstanding);
            }
            if amount < existing.committed {
                return Err(TrustError::CommitmentLowered);
            }
            if amount == existing.committed {
                return Ok(existing);
            }
            let next = CampaignCommitment {
                committed: amount,
                ..existing
            };
            put(&env, &key, &next);
            ReserveCommitted {
                id: campaign_id.clone(),
                committed: next.committed,
                outstanding: next.outstanding,
            }
            .publish(&env);
            return Ok(next);
        }
        let created = CampaignCommitment {
            authority_actor,
            asset: AssetRef {
                code_hash: asset_code_hash,
                scale,
            },
            committed: amount,
            outstanding: 0,
        };
        put(&env, &key, &created);
        ReserveCommitted {
            id: campaign_id,
            committed: created.committed,
            outstanding: created.outstanding,
        }
        .publish(&env);
        Ok(created)
    }

    pub fn authorize_reward(
        env: Env,
        grant_id: BytesN<32>,
        campaign_id: BytesN<32>,
        fan_actor: BytesN<32>,
        amount: i128,
    ) -> Result<RewardGrant, TrustError> {
        positive(amount)?;
        let campaign_key = DataKey::Campaign(campaign_id.clone());
        let mut campaign: CampaignCommitment = env
            .storage()
            .persistent()
            .get(&campaign_key)
            .ok_or(TrustError::CampaignMissing)?;
        require_actor(&env, &campaign.authority_actor)?;
        let grant_key = DataKey::Grant(grant_id.clone());
        if let Some(existing) = env.storage().persistent().get::<_, RewardGrant>(&grant_key) {
            if existing.campaign_id != campaign_id
                || existing.actor_hash != fan_actor
                || existing.authorized != amount
            {
                return Err(TrustError::PayloadConflict);
            }
            return Ok(existing);
        }
        let next_outstanding = campaign
            .outstanding
            .checked_add(amount)
            .ok_or(TrustError::AmountInvalid)?;
        if next_outstanding > campaign.committed {
            return Err(TrustError::AboveCommitted);
        }
        let grant = RewardGrant {
            campaign_id: campaign_id.clone(),
            actor_hash: fan_actor,
            authorized: amount,
            consumed: 0,
            released: 0,
        };
        campaign.outstanding = next_outstanding;
        put(&env, &campaign_key, &campaign);
        put(&env, &grant_key, &grant);
        RewardAuthorized {
            id: grant_id,
            amount,
        }
        .publish(&env);
        Ok(grant)
    }

    pub fn release_reward(
        env: Env,
        grant_id: BytesN<32>,
        command_id: BytesN<32>,
        amount: i128,
    ) -> Result<RewardGrant, TrustError> {
        positive(amount)?;
        let grant_key = DataKey::Grant(grant_id.clone());
        let mut grant: RewardGrant = env
            .storage()
            .persistent()
            .get(&grant_key)
            .ok_or(TrustError::GrantMissing)?;
        require_actor(&env, &grant.actor_hash)?;
        let slot = release_slot(&env, &grant_id, &command_id);
        let slot_key = DataKey::ReleaseCommand(slot);
        if env.storage().persistent().has(&slot_key) {
            return Ok(grant);
        }
        let remaining = grant
            .authorized
            .checked_sub(grant.consumed)
            .and_then(|v| v.checked_sub(grant.released))
            .ok_or(TrustError::AmountInvalid)?;
        if amount > remaining {
            return Err(TrustError::InsufficientRemaining);
        }
        let campaign_key = DataKey::Campaign(grant.campaign_id.clone());
        let mut campaign: CampaignCommitment = env
            .storage()
            .persistent()
            .get(&campaign_key)
            .ok_or(TrustError::CampaignMissing)?;
        grant.released = grant
            .released
            .checked_add(amount)
            .ok_or(TrustError::AmountInvalid)?;
        campaign.outstanding = campaign
            .outstanding
            .checked_sub(amount)
            .ok_or(TrustError::AmountInvalid)?;
        put(&env, &grant_key, &grant);
        put(&env, &campaign_key, &campaign);
        put(&env, &slot_key, &true);
        RewardReleased {
            id: grant_id,
            amount,
        }
        .publish(&env);
        Ok(grant)
    }

    pub fn redeem(
        env: Env,
        redemption_id: BytesN<32>,
        grant_id: BytesN<32>,
        amount: i128,
        target_hash: BytesN<32>,
        distribution_hash: BytesN<32>,
    ) -> Result<RedemptionRecord, TrustError> {
        positive(amount)?;
        let redemption_key = DataKey::Redemption(redemption_id.clone());
        if let Some(existing) = env
            .storage()
            .persistent()
            .get::<_, RedemptionRecord>(&redemption_key)
        {
            if existing.grant_id != grant_id
                || existing.amount != amount
                || existing.target_hash != target_hash
                || existing.distribution_hash != distribution_hash
            {
                return Err(TrustError::PayloadConflict);
            }
            return Ok(existing);
        }
        let grant_key = DataKey::Grant(grant_id.clone());
        let mut grant: RewardGrant = env
            .storage()
            .persistent()
            .get(&grant_key)
            .ok_or(TrustError::GrantMissing)?;
        require_actor(&env, &grant.actor_hash)?;
        let remaining = grant
            .authorized
            .checked_sub(grant.consumed)
            .and_then(|v| v.checked_sub(grant.released))
            .ok_or(TrustError::AmountInvalid)?;
        if amount > remaining {
            return Err(TrustError::InsufficientRemaining);
        }
        grant.consumed = grant
            .consumed
            .checked_add(amount)
            .ok_or(TrustError::AmountInvalid)?;
        let record = RedemptionRecord {
            grant_id: grant_id.clone(),
            amount,
            target_hash,
            distribution_hash,
            status: COMMITTED,
            materialization_hash: None,
        };
        put(&env, &grant_key, &grant);
        put(&env, &redemption_key, &record);
        RedemptionCommitted {
            id: redemption_id,
            amount,
        }
        .publish(&env);
        Ok(record)
    }

    /// Temporary trust assumption: the configured materializer attests that this
    /// exact redemption was written into the economic kernel. The contract does
    /// not read Prisma. Amount, target, grant and distribution hash stay fixed.
    pub fn lock_redemption(
        env: Env,
        redemption_id: BytesN<32>,
        revenue_hash: BytesN<32>,
        distribution_hash: BytesN<32>,
    ) -> Result<RedemptionRecord, TrustError> {
        let materializer: Address = env
            .storage()
            .instance()
            .get(&DataKey::Materializer)
            .ok_or(TrustError::NotMaterializer)?;
        materializer.require_auth();
        let key = DataKey::Redemption(redemption_id.clone());
        let mut record: RedemptionRecord = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(TrustError::RedemptionMissing)?;
        if record.distribution_hash != distribution_hash {
            return Err(TrustError::PayloadConflict);
        }
        let commitment =
            materialization_commitment(&env, &redemption_id, &revenue_hash, &distribution_hash);
        if record.status == LOCKED {
            if record.materialization_hash.as_ref() != Some(&commitment) {
                return Err(TrustError::PayloadConflict);
            }
            return Ok(record);
        }
        if record.status != COMMITTED {
            return Err(TrustError::NotCommitted);
        }
        record.status = LOCKED;
        record.materialization_hash = Some(commitment);
        put(&env, &key, &record);
        RedemptionLocked {
            id: redemption_id,
            amount: record.amount,
        }
        .publish(&env);
        Ok(record)
    }

    pub fn reverse_redemption(
        env: Env,
        redemption_id: BytesN<32>,
    ) -> Result<RedemptionRecord, TrustError> {
        let key = DataKey::Redemption(redemption_id.clone());
        let mut record: RedemptionRecord = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(TrustError::RedemptionMissing)?;
        let grant_key = DataKey::Grant(record.grant_id.clone());
        let mut grant: RewardGrant = env
            .storage()
            .persistent()
            .get(&grant_key)
            .ok_or(TrustError::GrantMissing)?;
        require_actor(&env, &grant.actor_hash)?;
        if record.status == REVERSED {
            return Ok(record);
        }
        if record.status == LOCKED {
            return Err(TrustError::Locked);
        }
        if record.status != COMMITTED {
            return Err(TrustError::NotCommitted);
        }
        grant.consumed = grant
            .consumed
            .checked_sub(record.amount)
            .ok_or(TrustError::AmountInvalid)?;
        record.status = REVERSED;
        put(&env, &grant_key, &grant);
        put(&env, &key, &record);
        RedemptionReversed {
            id: redemption_id,
            amount: record.amount,
        }
        .publish(&env);
        Ok(record)
    }

    pub fn get_campaign_state(env: Env, campaign_id: BytesN<32>) -> Option<CampaignCommitment> {
        env.storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
    }

    pub fn get_reward(env: Env, grant_id: BytesN<32>) -> Option<RewardGrant> {
        env.storage().persistent().get(&DataKey::Grant(grant_id))
    }

    pub fn get_redemption(env: Env, redemption_id: BytesN<32>) -> Option<RedemptionRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Redemption(redemption_id))
    }

    pub fn get_actor_capability(env: Env, actor: BytesN<32>) -> Option<Address> {
        env.storage().persistent().get(&DataKey::Capability(actor))
    }

    pub fn hash_materialization(
        env: Env,
        redemption_id: BytesN<32>,
        revenue_hash: BytesN<32>,
        distribution_hash: BytesN<32>,
    ) -> BytesN<32> {
        materialization_commitment(&env, &redemption_id, &revenue_hash, &distribution_hash)
    }

    /// Shared canonical hasher. TypeScript uses the same tag-length prefix.
    pub fn canonical_hash(env: Env, tag: String, body: Bytes) -> BytesN<32> {
        tagged_bytes(&env, &tag.to_bytes(), &body)
    }

    /// Body is count || repeated (actor hash || share bps), already sorted.
    pub fn distribution_commitment(env: Env, entries: Vec<(BytesN<32>, u32)>) -> BytesN<32> {
        let mut body = Bytes::new(&env);
        body.extend_from_slice(&(entries.len() as u32).to_be_bytes());
        for entry in entries.iter() {
            body.append(&entry.0.to_bytes());
            body.extend_from_slice(&entry.1.to_be_bytes());
        }
        tagged(&env, "moc.distribution.v1", &body)
    }
}
