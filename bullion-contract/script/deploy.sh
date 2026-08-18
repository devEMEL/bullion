#!/usr/bin/env bash
#
# GemFot protocol deployment script (liteforge_testnet).
#
# Usage:
#   1. Fill in the placeholder values in `.env` (at the root of gemfot-contract).
#   2. Run: ./script/deploy.sh
#
# `.env` is sourced automatically and every variable below uses `${VAR:-default}`, so the
# environment always wins.
#
# Each contract has its own forge script under `script/`. Addresses that are produced by
# earlier deployments are exported as environment variables for later scripts, so the whole
# protocol can be deployed in a single run.
#
# NOTE: the deployment order matters, do not re-order the steps.
#
set -euo pipefail

cd "$(dirname "$0")/.."

# ---------------------------------------------------------------------------- #
#                                CONFIGURATION                                 #
# ---------------------------------------------------------------------------- #

# --- .env -------------------------------------------------------------------- #
# `set -a` makes everything defined in .env an exported environment variable.
if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
fi

# --- Network / signer -------------------------------------------------------- #
export NETWORK="${NETWORK:-liteforge_testnet}"                            # matches [rpc_endpoints] in foundry.toml
export RPC_URL="${RPC_URL:-https://liteforge.rpc.caldera.xyz/http}"
export CHAIN_ID="${CHAIN_ID:-4441}"
export KEYSTORE_ACCOUNT="${KEYSTORE_ACCOUNT:?set KEYSTORE_ACCOUNT in .env}"
export DEPLOYER="${DEPLOYER:?set DEPLOYER in .env}"                 # keystore account address

# --- Verification (optional) ------------------------------------------------- #
export VERIFY="${VERIFY:-false}"                                    # "true" to append --verify
export VERIFIER="${VERIFIER:-blockscout}"                           # blockscout | etherscan | sourcify
export VERIFIER_URL="${VERIFIER_URL:-https://liteforge.blockscout.com}"
export ETHERSCAN_API_KEY="${ETHERSCAN_API_KEY:-}"

# --- Protocol parameters ----------------------------------------------------- #
export PROTOCOL_OWNER="${PROTOCOL_OWNER:?set PROTOCOL_OWNER in .env}"   # EOA owning the protocol contracts
# export NATIVE_TOKEN="${NATIVE_TOKEN:?set NATIVE_TOKEN in .env}"
# export POOL_MANAGER="${POOL_MANAGER:?set POOL_MANAGER in .env}"         # Uniswap V4 PoolManager on liteforge_testnet

# Fee distribution defaults used by {GemFotManager}
export SWAP_FEE="${SWAP_FEE:-100}"                                  # 1.00%
export PROTOCOL_FEE="${PROTOCOL_FEE:-10_00}"                         # 10.00%
export FEE_DISTRIBUTION_ACTIVE="${FEE_DISTRIBUTION_ACTIVE:-true}"

# {Launch} ERC721 metadata base URI
export BASE_URI="${BASE_URI:-}"                                     # e.g. https://api.gemfot.xyz/metadata/

# ---------------------------------------------------------------------------- #
#                                   HELPERS                                    #
# ---------------------------------------------------------------------------- #

# The keystore password may be supplied non-interactively via KEYSTORE_PASSWORD (env or .env).
PASSWORD_FLAGS=()
if [[ -n "${KEYSTORE_PASSWORD:-}" ]]; then
    PASSWORD_FLAGS=(--password "${KEYSTORE_PASSWORD}")
fi

FORGE_FLAGS=(--rpc-url "${RPC_URL}" --account "${KEYSTORE_ACCOUNT}" --sender "${DEPLOYER}" "${PASSWORD_FLAGS[@]+"${PASSWORD_FLAGS[@]}"}" --broadcast -vvv)
CAST_SEND_FLAGS=(--rpc-url "${RPC_URL}" --account "${KEYSTORE_ACCOUNT}" --from "${DEPLOYER}" "${PASSWORD_FLAGS[@]+"${PASSWORD_FLAGS[@]}"}")


# `ProtocolRoles.GEMFOT_MANAGER` == keccak256("GemFotManager") (NOT "GEMFOT_MANAGER")
GEMFOT_MANAGER_ROLE="$(cast keccak "GemFotManager")"


if [[ "${VERIFY}" == "true" ]]; then
    FORGE_FLAGS+=(--verify --verifier "${VERIFIER}" --verifier-url "${VERIFIER_URL}")
fi

# deploy <VarName> <ScriptFile>:<ScriptContract>
# Runs a forge script (retrying up to 3 times on flaky RPC / missing return value) and
# exports the parsed address into <VarName>.
#
# The forge output goes to stderr; only the summary line goes to stdout. This keeps the
# caller-side assignment `deploy ...` from accidentally capturing forge noise, and it runs in
# the main shell so a failure exits the script immediately (no `| tail -1` subshell to swallow it).
deploy() {
    local var="$1"
    local target="$2"
    local name="${target##*:}"

    echo ""
    echo "==> Deploying ${name} ..." >&2

    local output="" address=""
    local attempt
    for attempt in 1 2 3; do
        if output="$(forge script "script/${target}" "${FORGE_FLAGS[@]}" 2>&1)"; then
            # The scripts return a single `address`, printed by forge as `initialPrice_: address 0x...`
            address="$(printf '%s\n' "${output}" | grep -Eo '[a-zA-Z0-9_]+_: address 0x[a-fA-F0-9]{40}' | tail -1 | awk '{print $NF}')"
            [[ -n "${address}" ]] && break
        fi
        echo "!! Attempt ${attempt} failed for ${name} (no address parsed), retrying ..." >&2
    done
    echo "${output}" >&2

    if [[ -z "${address}" ]]; then
        echo "!! Could not parse deployed address for ${name}" >&2
        exit 1
    fi

    # Verify on-chain deployment by checking contract bytecode exists
    echo "==> Verifying on-chain code at ${address} ..." >&2
    local code=""
    code="$(cast code "${address}" --rpc-url "${RPC_URL}" || echo "0x")"
    if [[ "${code}" == "0x" || "${code}" == "0x0" || -z "${code}" ]]; then
        echo "!! On-chain verification failed: No bytecode at ${address} for ${name}" >&2
        exit 1
    fi
    echo "==> Confirmed on-chain code exists for ${name} at ${address}" >&2

    LAST_FORGE_OUTPUT="${output}"
    export LAST_FORGE_OUTPUT

    printf -v "${var}" '%s' "${address}"
    export "${var}"
    echo "${name} -> ${address}"
}

# ---------------------------------------------------------------------------- #
#                                 DEPLOYMENTS                                  #
# ---------------------------------------------------------------------------- #

# 0. DEX & Foundation Infrastructure
deploy BZKLTC DeployBZKLTC.s.sol:DeployBZKLTC
export NATIVE_TOKEN="${BZKLTC}"

deploy FAUCET_ADDRESS DeployFaucet.s.sol:DeployFaucet

deploy PERMIT2_ADDRESS dex/DeployPermit2.s.sol:DeployPermit2

deploy POOL_MANAGER dex/DeployPM.s.sol:DeployPM

deploy POSITION_MANAGER_ADDRESS dex/DeployPositionManager.s.sol:DeployPositionManager
export WETH_ADDRESS="$(printf '%s\n' "${LAST_FORGE_OUTPUT}" | grep -Eo 'weth_: address 0x[a-fA-F0-9]{40}' | awk '{print $NF}')"

deploy V4_QUOTER_ADDRESS dex/DeployQuoter.s.sol:DeployQuoter

deploy STATEVIEW_ADDRESS dex/DeployStateView.s.sol:DeployStateView

deploy UNIVERSALROUTER_ADDRESS dex/DeployUniversalRouter.s.sol:DeployUniversalRouter

# 1. Initial price calculator
deploy INITIAL_PRICE DeployMarketCappedPrice.s.sol:DeployMarketCappedPrice

# 2. Fee exemptions
deploy FEE_EXEMPTIONS DeployFeeExemptions.s.sol:DeployFeeExemptions

# 3. Treasury action manager
deploy ACTION_MANAGER DeployActionManager.s.sol:DeployActionManager

# 4. Indexer subscriber (required by the FeeEscrow)
deploy INDEXER DeployIndexer.s.sol:DeployIndexer

# 5. Fee escrow (requires NATIVE_TOKEN + INDEXER)
deploy FEE_ESCROW DeployFeeEscrow.s.sol:DeployFeeEscrow

# 6. Fee escrow registry (optional bookkeeping contract)
deploy FEE_ESCROW_REGISTRY DeployFeeEscrowRegistry.s.sol:DeployFeeEscrowRegistry

# 7. Protocol fee recipient
deploy PROTOCOL_FEE_RECIPIENT DeployProtocolFeeRecipient.s.sol:DeployProtocolFeeRecipient

# 8. Fair launch (requires POOL_MANAGER)
deploy FAIR_LAUNCH DeployFairLaunch.s.sol:DeployFairLaunch

# 9. Bid wall (requires NATIVE_TOKEN + POOL_MANAGER + PROTOCOL_OWNER)
deploy BID_WALL DeployBidWall.s.sol:DeployBidWall

# 10. Clonable implementations
deploy MEMECOIN_IMPLEMENTATION DeployMemecoin.s.sol:DeployMemecoin
deploy MEMECOIN_TREASURY_IMPLEMENTATION DeployMemecoinTreasury.s.sol:DeployMemecoinTreasury

# 11. GemFotManager hook (CREATE2 mined address, requires all of the above)
deploy GEMFOT_MANAGER DeployGemFotManager.s.sol:DeployGemFotManager

# 12. Launch ERC721 (requires the implementations + GEMFOT_MANAGER)
deploy LAUNCH DeployLaunch.s.sol:DeployLaunch

# 13. Notifier + subscribers
#
# NOTE: {GemFotManager} deploys its OWN {Notifier} in its constructor and only ever calls
# `notifySubscribers` on that instance. Deploying a standalone Notifier would leave the
# subscribers wired to a contract that never notifies, so we read it off the hook instead.
export NOTIFIER="$(cast call "${GEMFOT_MANAGER}" "notifier()(address)" --rpc-url "${RPC_URL}")"
echo "==> Notifier (deployed by GemFotManager): ${NOTIFIER}"
deploy PREVENT_NO_FAIR_LAUNCH DeployPreventNoFairLaunch.s.sol:DeployPreventNoFairLaunch


# 14. Zaps
deploy POOL_SWAP DeployPoolSwap.s.sol:DeployPoolSwap

# 15. Treasury actions (BuyBack requires POOL_SWAP)
deploy BLANK_ACTION DeployBlankAction.s.sol:DeployBlankAction
deploy BURN_TOKENS_ACTION DeployBurnTokensAction.s.sol:DeployBurnTokensAction
deploy BUY_BACK_ACTION DeployBuyBackAction.s.sol:DeployBuyBackAction

# ---------------------------------------------------------------------------- #
#                          WIRING (SETTERS / ROLES)                            #
# ---------------------------------------------------------------------------- #
#
# Every one of these is owner/admin gated and the deployer (${DEPLOYER}) is the owner of
# each contract it deployed, so they can all be executed in this same run.

echo ""
echo "==> Wiring the protocol ..."

# --- Access control ---------------------------------------------------------- #
# {FairLaunch} grants DEFAULT_ADMIN_ROLE to `msg.sender` (the deployer),
# {BidWall} grants it to PROTOCOL_OWNER. Both need the GEMFOT_MANAGER role for the hook.
cast send "${FAIR_LAUNCH}" "grantRole(bytes32,address)" "${GEMFOT_MANAGER_ROLE}" "${GEMFOT_MANAGER}" "${CAST_SEND_FLAGS[@]}"
cast send "${BID_WALL}"    "grantRole(bytes32,address)" "${GEMFOT_MANAGER_ROLE}" "${GEMFOT_MANAGER}" "${CAST_SEND_FLAGS[@]}"

# --- {GemFotManager} --------------------------------------------------------- #
# `launchContract` and `initialPrice` are only settable post-deployment.
cast send "${GEMFOT_MANAGER}" "setLaunch(address)"       "${LAUNCH}"        "${CAST_SEND_FLAGS[@]}"
cast send "${GEMFOT_MANAGER}" "setInitialPrice(address)" "${INITIAL_PRICE}" "${CAST_SEND_FLAGS[@]}"

# The global {FeeDistributor} values are already set in the constructor, but we re-assert
# them here so a redeploy of the same hook can be re-configured without a new deployment.
cast send "${GEMFOT_MANAGER}" "setFeeDistribution((uint24,uint24,bool))" \
    "(${SWAP_FEE},${PROTOCOL_FEE},${FEE_DISTRIBUTION_ACTIVE})" "${CAST_SEND_FLAGS[@]}"

# --- {IndexerSubscriber} ----------------------------------------------------- #
# Maps the notifier -> launch contract, without this the indexer silently no-ops.
cast send "${INDEXER}" "setNotifierLaunch(address,address)" "${NOTIFIER}" "${LAUNCH}" "${CAST_SEND_FLAGS[@]}"

# --- {Notifier} subscribers -------------------------------------------------- #
# The {Notifier} is owned by PROTOCOL_OWNER (set in the GemFotManager constructor).
# NOTE: the {IndexerSubscriber} MUST be subscribed too, otherwise no pool is ever indexed
# and the {FeeEscrow} creator-fee lookups will fail.
cast send "${NOTIFIER}" "subscribe(address,bytes)" "${INDEXER}"                0x "${CAST_SEND_FLAGS[@]}"
cast send "${NOTIFIER}" "subscribe(address,bytes)" "${PREVENT_NO_FAIR_LAUNCH}" 0x "${CAST_SEND_FLAGS[@]}"

# --- {ProtocolFeeRecipient} / {FeeEscrowRegistry} ---------------------------- #
cast send "${PROTOCOL_FEE_RECIPIENT}" "setFeeEscrow(address,bool)" "${FEE_ESCROW}" true  "${CAST_SEND_FLAGS[@]}"
cast send "${FEE_ESCROW_REGISTRY}"    "addFeeEscrow(address,bool)" "${FEE_ESCROW}" false "${CAST_SEND_FLAGS[@]}"

# --- {TreasuryActionManager} ------------------------------------------------- #
cast send "${ACTION_MANAGER}" "approveAction(address)" "${BLANK_ACTION}"       "${CAST_SEND_FLAGS[@]}"
cast send "${ACTION_MANAGER}" "approveAction(address)" "${BURN_TOKENS_ACTION}" "${CAST_SEND_FLAGS[@]}"
cast send "${ACTION_MANAGER}" "approveAction(address)" "${BUY_BACK_ACTION}"    "${CAST_SEND_FLAGS[@]}"

# ---------------------------------------------------------------------------- #
#                                   SUMMARY                                    #
# ---------------------------------------------------------------------------- #


cat <<EOF

================================ DEPLOYED ================================
Network                        : ${NETWORK}
Deployer                       : ${DEPLOYER}

BZKLTC (Native Token)          : ${BZKLTC}
Faucet                         : ${FAUCET_ADDRESS}
Permit2                        : ${PERMIT2_ADDRESS}
PoolManager                    : ${POOL_MANAGER}
PositionManager                : ${POSITION_MANAGER_ADDRESS}
WETH                           : ${WETH_ADDRESS}
V4Quoter                       : ${V4_QUOTER_ADDRESS}
StateView                      : ${STATEVIEW_ADDRESS}
UniversalRouter                : ${UNIVERSALROUTER_ADDRESS}

USDCMarketCappedPrice          : ${INITIAL_PRICE}
FeeExemptions                  : ${FEE_EXEMPTIONS}
TreasuryActionManager          : ${ACTION_MANAGER}
IndexerSubscriber              : ${INDEXER}
FeeEscrow                      : ${FEE_ESCROW}
FeeEscrowRegistry              : ${FEE_ESCROW_REGISTRY}
ProtocolFeeRecipient           : ${PROTOCOL_FEE_RECIPIENT}
FairLaunch                     : ${FAIR_LAUNCH}
BidWall                        : ${BID_WALL}
Memecoin (implementation)      : ${MEMECOIN_IMPLEMENTATION}
MemecoinTreasury (impl)        : ${MEMECOIN_TREASURY_IMPLEMENTATION}
GemFotManager (hook)           : ${GEMFOT_MANAGER}
Launch                         : ${LAUNCH}
Notifier                       : ${NOTIFIER}
PreventNoFairLaunch            : ${PREVENT_NO_FAIR_LAUNCH}
PoolSwap                       : ${POOL_SWAP}
BlankAction                    : ${BLANK_ACTION}
BurnTokensAction               : ${BURN_TOKENS_ACTION}
BuyBackAction                  : ${BUY_BACK_ACTION}
==========================================================================

All of the required setters/roles above were executed by this script.

REMAINING OPTIONAL CONFIGURATION (not required for a working deployment):

  # Per-pool overrides (owner only, called once a pool exists)
  cast send ${GEMFOT_MANAGER} "setPoolFeeDistribution(bytes32,(uint24,uint24,bool))" <poolId> "(300,200,true)" --rpc-url ${RPC_URL} --account ${KEYSTORE_ACCOUNT}
  cast send ${GEMFOT_MANAGER} "setProtocolFeeDistribution(uint24)" <protocolFee> --rpc-url ${RPC_URL} --account ${KEYSTORE_ACCOUNT}

  # Fee exemptions for integrators / routers (owner only)
  cast send ${FEE_EXEMPTIONS} "setFeeExemption(address,uint24)" <beneficiary> <swapFee> --rpc-url ${RPC_URL} --account ${KEYSTORE_ACCOUNT}

  # BidWall tuning (owner only, defaults are already sane)
  cast send ${BID_WALL} "setSwapFeeThreshold(uint256)" <threshold> --rpc-url ${RPC_URL} --account ${KEYSTORE_ACCOUNT}
  cast send ${BID_WALL} "setStaleTimeWindow(uint256)" <seconds> --rpc-url ${RPC_URL} --account ${KEYSTORE_ACCOUNT}

  # Launch metadata / implementation upgrades (owner only, set in the constructor already)
  cast send ${LAUNCH} "setBaseURI(string)" "${BASE_URI}" --rpc-url ${RPC_URL} --account ${KEYSTORE_ACCOUNT}
  cast send ${LAUNCH} "setMemecoinImplementation(address)" ${MEMECOIN_IMPLEMENTATION} --rpc-url ${RPC_URL} --account ${KEYSTORE_ACCOUNT}
  cast send ${LAUNCH} "setMemecoinTreasuryImplementation(address)" ${MEMECOIN_TREASURY_IMPLEMENTATION} --rpc-url ${RPC_URL} --account ${KEYSTORE_ACCOUNT}

  # MarketCappedPrice launch fee (owner only, defaults to 0)
  cast send ${INITIAL_PRICE} "setLaunchFee(uint256)" <fee> --rpc-url ${RPC_URL} --account ${KEYSTORE_ACCOUNT}

  # NOT protocol-owner setters (called by memecoin creators, per pool):
  #   BidWall.setDisabledState(PoolKey,bool)
  #   Launch.setMemecoinMetadata(uint256,string)
  #   Memecoin.setMetadata(...)

EOF

# ---------------------------------------------------------------------------- #
#                           UPDATE ENVIRONMENT FILE                            #
# ---------------------------------------------------------------------------- #

ENV_FILE="$(dirname "$0")/../.env"
if [[ -f "${ENV_FILE}" ]]; then
    echo "==> Updating ${ENV_FILE} with deployed addresses ..."
    
    update_env_var() {
        local key="$1"
        local val="$2"
        if grep -q "^${key}=" "${ENV_FILE}"; then
            sed -i "s|^${key}=.*|${key}=${val}|" "${ENV_FILE}"
        else
            echo "${key}=${val}" >> "${ENV_FILE}"
        fi
    }

    update_env_var "NATIVE_TOKEN" "${BZKLTC}"
    update_env_var "BZKLTC" "${BZKLTC}"
    update_env_var "FAUCET_ADDRESS" "${FAUCET_ADDRESS}"
    update_env_var "PERMIT2_ADDRESS" "${PERMIT2_ADDRESS}"
    update_env_var "POOL_MANAGER" "${POOL_MANAGER}"
    update_env_var "POSITION_MANAGER_ADDRESS" "${POSITION_MANAGER_ADDRESS}"
    update_env_var "WETH_ADDRESS" "${WETH_ADDRESS}"
    update_env_var "V4_QUOTER_ADDRESS" "${V4_QUOTER_ADDRESS}"
    update_env_var "STATEVIEW_ADDRESS" "${STATEVIEW_ADDRESS}"
    update_env_var "UNIVERSALROUTER_ADDRESS" "${UNIVERSALROUTER_ADDRESS}"
    update_env_var "INITIAL_PRICE" "${INITIAL_PRICE}"
    update_env_var "FEE_EXEMPTIONS" "${FEE_EXEMPTIONS}"
    update_env_var "ACTION_MANAGER" "${ACTION_MANAGER}"
    update_env_var "INDEXER" "${INDEXER}"
    update_env_var "FEE_ESCROW" "${FEE_ESCROW}"
    update_env_var "FEE_ESCROW_REGISTRY" "${FEE_ESCROW_REGISTRY}"
    update_env_var "PROTOCOL_FEE_RECIPIENT" "${PROTOCOL_FEE_RECIPIENT}"
    update_env_var "FAIR_LAUNCH" "${FAIR_LAUNCH}"
    update_env_var "BID_WALL" "${BID_WALL}"
    update_env_var "MEMECOIN_IMPLEMENTATION" "${MEMECOIN_IMPLEMENTATION}"
    update_env_var "MEMECOIN_TREASURY_IMPLEMENTATION" "${MEMECOIN_TREASURY_IMPLEMENTATION}"
    update_env_var "GEMFOT_MANAGER" "${GEMFOT_MANAGER}"
    update_env_var "LAUNCH" "${LAUNCH}"
    update_env_var "NOTIFIER" "${NOTIFIER}"
    update_env_var "PREVENT_NO_FAIR_LAUNCH" "${PREVENT_NO_FAIR_LAUNCH}"
    update_env_var "POOL_SWAP" "${POOL_SWAP}"
    update_env_var "BLANK_ACTION" "${BLANK_ACTION}"
    update_env_var "BURN_TOKENS_ACTION" "${BURN_TOKENS_ACTION}"
    update_env_var "BUY_BACK_ACTION" "${BUY_BACK_ACTION}"

    echo "==> .env updated successfully!"
fi

# ---------------------------------------------------------------------------- #
#                         UPDATE FRONTEND CONSTANTS                            #
# ---------------------------------------------------------------------------- #

FRONTEND_NETWORKS="$(dirname "$0")/../../bullion-frontend/src/config/networks.ts"
FRONTEND_CONSTANTS="$(dirname "$0")/../../bullion-frontend/src/lib/constants.ts"

if [[ -f "${FRONTEND_NETWORKS}" ]]; then
    echo "==> Updating ${FRONTEND_NETWORKS} ..."
    sed -i "s|nativeToken: '0x.*'|nativeToken: '${BZKLTC}'|" "${FRONTEND_NETWORKS}"
    sed -i "s|poolManager: '0x.*'|poolManager: '${POOL_MANAGER}'|" "${FRONTEND_NETWORKS}"
    sed -i "s|positionManager: '0x.*'|positionManager: '${POSITION_MANAGER_ADDRESS}'|" "${FRONTEND_NETWORKS}"
    sed -i "s|stateView: '0x.*'|stateView: '${STATEVIEW_ADDRESS}'|" "${FRONTEND_NETWORKS}"
    sed -i "s|permit2: '0x.*'|permit2: '${PERMIT2_ADDRESS}'|" "${FRONTEND_NETWORKS}"
    sed -i "s|gemfotManager: '0x.*'|gemfotManager: '${GEMFOT_MANAGER}'|" "${FRONTEND_NETWORKS}"
    sed -i "s|launch: '0x.*'|launch: '${LAUNCH}'|" "${FRONTEND_NETWORKS}"
    sed -i "s|fairLaunch: '0x.*'|fairLaunch: '${FAIR_LAUNCH}'|" "${FRONTEND_NETWORKS}"
    sed -i "s|bidWall: '0x.*'|bidWall: '${BID_WALL}'|" "${FRONTEND_NETWORKS}"
    sed -i "s|initialPrice: '0x.*'|initialPrice: '${INITIAL_PRICE}'|" "${FRONTEND_NETWORKS}"
    sed -i "s|feeEscrow: '0x.*'|feeEscrow: '${FEE_ESCROW}'|" "${FRONTEND_NETWORKS}"
    sed -i "s|feeExemptions: '0x.*'|feeExemptions: '${FEE_EXEMPTIONS}'|" "${FRONTEND_NETWORKS}"
    sed -i "s|actionManager: '0x.*'|actionManager: '${ACTION_MANAGER}'|" "${FRONTEND_NETWORKS}"
    sed -i "s|notifier: '0x.*'|notifier: '${NOTIFIER}'|" "${FRONTEND_NETWORKS}"
    sed -i "s|indexer: '0x.*'|indexer: '${INDEXER}'|" "${FRONTEND_NETWORKS}"
    sed -i "s|protocolFeeRecipient: '0x.*'|protocolFeeRecipient: '${PROTOCOL_FEE_RECIPIENT}'|" "${FRONTEND_NETWORKS}"
    sed -i "s|memecoinImplementation: '0x.*'|memecoinImplementation: '${MEMECOIN_IMPLEMENTATION}'|" "${FRONTEND_NETWORKS}"
    sed -i "s|memecoinTreasuryImplementation: '0x.*'|memecoinTreasuryImplementation: '${MEMECOIN_TREASURY_IMPLEMENTATION}'|" "${FRONTEND_NETWORKS}"
    sed -i "s|poolSwap: '0x.*'|poolSwap: '${POOL_SWAP}'|" "${FRONTEND_NETWORKS}"
fi

if [[ -f "${FRONTEND_CONSTANTS}" ]]; then
    echo "==> Updating ${FRONTEND_CONSTANTS} ..."
    sed -i "s|export const USDC_ADDRESS = \"0x.*\"|export const USDC_ADDRESS = \"${BZKLTC}\"|" "${FRONTEND_CONSTANTS}"
    sed -i "s|export const POOLMANAGER_ADDRESS = \"0x.*\"|export const POOLMANAGER_ADDRESS = \"${POOL_MANAGER}\"|" "${FRONTEND_CONSTANTS}"
    sed -i "s|export const V4_QUOTER_ADDRESS = \"0x.*\"|export const V4_QUOTER_ADDRESS = \"${V4_QUOTER_ADDRESS}\"|" "${FRONTEND_CONSTANTS}"
    sed -i "s|export const PERMIT2_ADDRESS = \"0x.*\"|export const PERMIT2_ADDRESS = \"${PERMIT2_ADDRESS}\"|" "${FRONTEND_CONSTANTS}"
    sed -i "s|export const WETH_ADDRESS=\"0x.*\"|export const WETH_ADDRESS=\"${WETH_ADDRESS}\"|" "${FRONTEND_CONSTANTS}"
    sed -i "s|POSITION_MANAGER_ADDRESS=\"0x.*\"|POSITION_MANAGER_ADDRESS=\"${POSITION_MANAGER_ADDRESS}\"|" "${FRONTEND_CONSTANTS}"
    sed -i "s|export const STATEVIEW_ADDRESS= \"0x.*\"|export const STATEVIEW_ADDRESS= \"${STATEVIEW_ADDRESS}\"|" "${FRONTEND_CONSTANTS}"
    sed -i "s|export const UNIVERSALROUTER_ADDRESS=\"0x.*\"|export const UNIVERSALROUTER_ADDRESS=\"${UNIVERSALROUTER_ADDRESS}\"|" "${FRONTEND_CONSTANTS}"
    sed -i "s|export const FAUCET_ADDRESS=\"0x.*\"|export const FAUCET_ADDRESS=\"${FAUCET_ADDRESS}\"|" "${FRONTEND_CONSTANTS}"
    sed -i "s|export const POINTSHOOK_ADDRESS=\"0x.*\"|export const POINTSHOOK_ADDRESS=\"${GEMFOT_MANAGER}\"|" "${FRONTEND_CONSTANTS}"
fi

echo "==> All deployment addresses synchronized to .env and bullion-frontend!"
