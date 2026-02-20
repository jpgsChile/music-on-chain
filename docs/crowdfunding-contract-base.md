# Crowdfunding Smart Contract — Avalanche Fuji Testnet

## Objetivo

Campañas de crowdfunding on-chain en Avalanche Fuji (testnet): el artista define meta y deadline; los fans envían USDC al contrato; el artista retira cuando se cumple la meta o tras el deadline.

## Diseño

- **Una campaña = un contrato** (o un contrato factory que despliega instancias). Por simplicidad, un contrato por campaña: el artista (owner) lo despliega con `targetAmount` (USDC con 6 decimales) y `deadline` (timestamp).
- **Contribuciones**: Los fans aprueban USDC al contrato y llaman `contribute(amount)`. El contrato hace `transferFrom` del USDC y emite evento `Contributed(backer, amount, newTotal)`.
- **Retirada**: Solo el owner puede llamar `withdraw()`. Permitido cuando `raised >= targetAmount` o cuando `block.timestamp >= deadline`. Un solo withdraw por campaña; el contrato envía todo el USDC al owner.
- **Perks y canciones**: Se gestionan off-chain (metadata en frontend). El contrato solo maneja: meta, deadline, raised, owner y lógica de contribute/withdraw.

## Variables de estado

| Variable     | Tipo      | Descripción                          |
|-------------|-----------|--------------------------------------|
| `targetAmount` | uint256 | Meta en USDC (6 decimals)             |
| `deadline`     | uint256 | Timestamp fin de campaña              |
| `raised`       | uint256 | Total recaudado                       |
| `owner`        | address | Creador de la campaña (artista)        |
| `usdc`         | address | Dirección del token USDC (Avalanche Fuji) |

## Funciones

- `constructor(address _usdc, uint256 _targetAmount, uint256 _deadline)`
- `contribute(uint256 amount)`: requiere `block.timestamp < deadline`, transfiere USDC del msg.sender al contrato, actualiza `raised`, emite `Contributed`.
- `withdraw()`: solo owner; requiere `raised >= targetAmount || block.timestamp >= deadline`; transfiere todo el balance USDC al owner y emite `Withdrawn`.

## Integración en el frontend

- El ABI y tipos están en `lib/contracts/crowdfundingContract.ts`.
- Cuando el contrato esté desplegado en Avalanche Fuji, asignar la dirección a `CROWDFUNDING_CAMPAIGN_ADDRESS`.
- Opcional: leer `raised` desde el contrato para progreso en tiempo real; las contribuciones vía app pueden seguir yendo a la wallet del artista (flujo actual) hasta que todo pase por contrato.

## Red

- **Avalanche Fuji** (testnet): Chain ID 43113. USDC testnet según documentación de Avalanche.
