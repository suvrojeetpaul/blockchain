from fastapi import FastAPI, HTTPException

from models import WalletAnalysisRequest

from investigation.service import (
    analyze_wallet
)
from rule_application import router as rule_application_router
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


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

    try:

        result = analyze_wallet(
            wallet,
            request.max_transactions
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