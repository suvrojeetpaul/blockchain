import os
from pathlib import Path

import requests
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parent.parent / ".env")


ALCHEMY_URL = os.getenv("ALCHEMY_URL")


def _request_transfers(params):

    if not ALCHEMY_URL:
        raise RuntimeError(
            "ALCHEMY_URL is not configured"
        )

    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "alchemy_getAssetTransfers",
        "params": [params]
    }

    response = requests.post(
        ALCHEMY_URL,
        json=payload,
        timeout=30
    )

    response.raise_for_status()

    data = response.json()

    if "error" in data:

        raise RuntimeError(
            data["error"]["message"]
        )

    return data["result"]


def _normalize_transfer(
    transfer,
    direction
):

    metadata = transfer.get(
        "metadata",
        {}
    )

    return {

        "hash": transfer.get(
            "hash"
        ),

        "from": transfer.get(
            "from"
        ),

        "to": transfer.get(
            "to"
        ),

        "value": transfer.get(
            "value",
            0
        ),

        "asset": transfer.get(
            "asset",
            "ETH"
        ),

        "category": transfer.get(
            "category"
        ),

        "blockNum": transfer.get(
            "blockNum"
        ),

        "blockTimestamp": metadata.get(
            "blockTimestamp"
        ),

        "direction": direction
    }


def get_eth_transactions(
    wallet_address: str,
    max_count: int = 50
):

    if not wallet_address:

        raise ValueError(
            "Wallet address cannot be empty"
        )

    if max_count < 1:

        raise ValueError(
            "max_count must be at least 1"
        )

    if max_count > 1000:

        raise ValueError(
            "max_count cannot exceed 1000"
        )

    # --------------------------------------------
    # Request outgoing transfers
    # --------------------------------------------

    outgoing_result = _request_transfers(
        {
            "fromAddress": wallet_address,

            "category": [
                "external",
                "internal"
            ],

            "withMetadata": True,

            "excludeZeroValue": True,

            "maxCount": hex(max_count),

            "order": "desc"
        }
    )

    # --------------------------------------------
    # Request incoming transfers
    # --------------------------------------------

    incoming_result = _request_transfers(
        {
            "toAddress": wallet_address,

            "category": [
                "external",
                "internal"
            ],

            "withMetadata": True,

            "excludeZeroValue": True,

            "maxCount": hex(max_count),

            "order": "desc"
        }
    )

    transactions = []

    # --------------------------------------------
    # Normalize outgoing transactions
    # --------------------------------------------

    for tx in outgoing_result.get(
        "transfers",
        []
    ):

        transactions.append(
            _normalize_transfer(
                tx,
                "outgoing"
            )
        )

    # --------------------------------------------
    # Normalize incoming transactions
    # --------------------------------------------

    for tx in incoming_result.get(
        "transfers",
        []
    ):

        transactions.append(
            _normalize_transfer(
                tx,
                "incoming"
            )
        )

    # --------------------------------------------
    # Remove duplicate transaction records
    # --------------------------------------------

    unique_transactions = {}

    for tx in transactions:

        tx_hash = tx.get("hash")

        if not tx_hash:
            continue

        unique_transactions[
            tx_hash
        ] = tx

    transactions = list(
        unique_transactions.values()
    )

    # --------------------------------------------
    # Sort newest first
    # --------------------------------------------

    transactions.sort(
        key=lambda x: (
            x.get(
                "blockTimestamp"
            ) or ""
        ),
        reverse=True
    )

    # --------------------------------------------
    # Return requested number
    # --------------------------------------------

    return transactions[:max_count]