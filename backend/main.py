import os
import re

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import WalletAnalysisRequest

from investigation.service import analyze_wallet
from rule_application import router as rule_application_router
from wallet_cache import WalletAnalysisCache
from wallet_store import WalletStore


ETHEREUM_ADDRESS = re.compile(r"^0x[a-fA-F0-9]{40}$")


def _positive_int_setting(name: str, default: int) -> int:
    value = int(os.getenv(name, default))
    if value < 1:
        raise ValueError(f"{name} must be at least 1")
    return value


analysis_cache = WalletAnalysisCache(
    max_entries=_positive_int_setting("WALLET_CACHE_MAX_ENTRIES", 128),
    ttl_seconds=_positive_int_setting("WALLET_CACHE_TTL_SECONDS", 300),
)
wallet_store = WalletStore()


app = FastAPI(
    title="Crypto Fraud Intelligence API",
    description=(
        "Automated blockchain analytics "
        "for cryptocurrency fraud investigation"
    ),
    version="0.3.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(rule_application_router)

@app.get("/")
def home():

    return {

        "status": "online",

        "message":
            "Crypto Fraud Intelligence API is running",

        "version": "0.3.0"
    }


@app.get("/health")
def health():

    return {
        "status": "healthy"
    }


@app.post("/analyze")
def analyze(
    request: WalletAnalysisRequest
):

    wallet = request.wallet_address.strip()

    blockchain = (
        request.blockchain
        .lower()
        .strip()
    )

    if not wallet:

        raise HTTPException(
            status_code=400,
            detail="Wallet address cannot be empty"
        )

    if not ETHEREUM_ADDRESS.fullmatch(wallet):
        raise HTTPException(
            status_code=400,
            detail="Invalid Ethereum wallet address"
        )

    if blockchain != "ethereum":

        raise HTTPException(
            status_code=400,
            detail=(
                "Currently only Ethereum "
                "is supported"
            )
        )

    if (
        request.max_transactions < 1
        or request.max_transactions > 100
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "max_transactions must "
                "be between 1 and 100"
            )
        )

    cache_key = f"{wallet.lower()}:{request.max_transactions}"
    cached_result = analysis_cache.get(cache_key)

    try:
        if cached_result is not None:
            result = cached_result
            cache_hit = True
        else:
            result = analyze_wallet(
                wallet,
                request.max_transactions
            )
            analysis_cache.set(cache_key, result)
            cache_hit = False

        wallet_store.record_search(
            wallet_address=wallet.lower(),
            blockchain=blockchain,
            max_transactions=request.max_transactions,
            analysis=result,
            cache_hit=cache_hit,
        )

        return {
            "status": "success",
            "analysis": result
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )