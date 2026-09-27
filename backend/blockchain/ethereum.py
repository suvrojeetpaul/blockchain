import os
from pathlib import Path

from dotenv import load_dotenv
from web3 import Web3


load_dotenv(Path(__file__).resolve().parent.parent / ".env")

ALCHEMY_URL = os.getenv("ALCHEMY_URL")

if not ALCHEMY_URL:
    raise RuntimeError("ALCHEMY_URL is not configured in .env")


w3 = Web3(Web3.HTTPProvider(ALCHEMY_URL))


def is_connected():
    return w3.is_connected()


def get_latest_block():
    return w3.eth.block_number


def get_balance(wallet_address: str):
    checksum_address = w3.to_checksum_address(wallet_address)

    balance_wei = w3.eth.get_balance(checksum_address)

    balance_eth = w3.from_wei(balance_wei, "ether")

    return float(balance_eth)