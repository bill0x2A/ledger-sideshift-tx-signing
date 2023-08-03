import type { NextApiRequest, NextApiResponse } from 'next'
import '../../lib/protocol_pb.js';
import { generatePayloadAndSignature, numberToBigEndianBuffer } from '../../util/helpers';
import { NextResponse } from 'next/server.js';

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

export async function POST (
  req: any
) {

  const { input }: { input: LedgerSignInput } = await req.json();

  const {
      depositAddress,
      depositMemo,
      refundAddress,
      refundMemo,
      settleAddress,
      settleMemo,
      depositMethodId,
      settleMethodId,
      depositAmount,
      settleAmount,
      deviceTransactionId,   
  } = input;

  const ledgerPrivateKey = process.env.LEDGER_PRIVATE_KEY;

  if (!ledgerPrivateKey) {
    throw new Error('Ledger private key not configured');
  }

  const tr = new proto.ledger_swap.NewTransactionResponse();

  tr.setPayinAddress(depositAddress);
  tr.setPayinExtraId(depositMemo ?? '');
  tr.setRefundAddress(refundAddress ?? '');
  tr.setRefundExtraId(refundMemo ?? '');
  tr.setPayoutAddress(settleAddress);
  tr.setPayoutExtraId(settleMemo ?? '');
  tr.setCurrencyFrom(depositMethodId);
  tr.setCurrencyTo(settleMethodId);
  tr.setAmountToProvider(numberToBigEndianBuffer(depositAmount));
  tr.setAmountToWallet(numberToBigEndianBuffer(settleAmount));
  tr.setDeviceTransactionId(deviceTransactionId);

  const { payload, signature } = generatePayloadAndSignature(tr, ledgerPrivateKey);

  return NextResponse.json({ payload, signature });
}
