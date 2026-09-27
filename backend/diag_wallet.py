import os, traceback
print('HAS_URL', bool(os.getenv('ALCHEMY_URL')))
from blockchain.transactions import get_eth_transactions
try:
    txs = get_eth_transactions('0xd061C58B239D9f1c42D6a94aC8Ca276Cc3eA2142', max_count=3)
    print('COUNT', len(txs))
    print('FIRST', txs[0] if txs else None)
except Exception:
    traceback.print_exc()
