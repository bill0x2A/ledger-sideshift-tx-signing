type LedgerSignInput = {
    depositAddress: string;
    depositMemo?: string;
    refundAddress?: string;
    refundMemo?: string;
    settleAddress: string;
    settleMemo?: string;
    depositMethodId: string;
    settleMethodId: string;
    depositAmount: string;
    settleAmount: string;
    deviceTransactionId: string;
};

type LedgerSignOutput = {
  payload: string;
  signature: string;
};

export type { LedgerSignInput, LedgerSignOutput };
