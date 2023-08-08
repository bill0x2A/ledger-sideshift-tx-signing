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

type Options = {
  shouldHash?: boolean;
  copyAndPastedSigningMethod?: boolean;
  googlePayloadGeneration?: boolean;
};

export type { LedgerSignInput, Options };
