import { NextResponse } from 'next/server.js';
import { LedgerSignInput } from '@/app/types.js';
import base64url from 'base64url';
import { ec as EC } from 'elliptic';
import { createHash } from 'crypto';
import '../../lib/protocol_pb.js';

// https://github.com/LedgerHQ/platform-app-test-exchange/blob/main/src/utils/numberToBigEndianBuffer.ts
// x modified to be BigInt
const numberToBigEndianBuffer = (x: BigInt) => {
  var hex = x.toString(16);
  return Uint8Array.from(
    Buffer.from(hex.padStart(hex.length + (hex.length % 2), "0"), "hex")
  );
};

// https://github.com/LedgerHQ/platform-app-test-exchange/blob/main/src/getData/index.ts
// Based on above, modified to use proto.ledger_swap.NewTransactionResponse (not included in example repo)
const generatePayload = (input: LedgerSignInput): Buffer => {
  const tr = new proto.ledger_swap.NewTransactionResponse();

  tr.setPayinAddress(input.depositAddress);
  input.depositMemo && tr.setPayinExtraId(input.depositMemo);
  input.refundAddress && tr.setRefundAddress(input.refundAddress);
  input.refundMemo && tr.setRefundExtraId(input.refundMemo);
  tr.setPayoutAddress(input.settleAddress);
  input.settleMemo && tr.setPayoutExtraId(input.settleMemo);
  tr.setCurrencyFrom(input.depositMethodId);
  tr.setCurrencyTo(input.settleMethodId);
  tr.setAmountToProvider(numberToBigEndianBuffer(BigInt(input.depositAmount)));
  tr.setAmountToWallet(numberToBigEndianBuffer(BigInt(input.settleAmount)));
  tr.setDeviceTransactionId(input.deviceTransactionId);

  // Serialize protobuf, return as buffer (modified from example to be compatible with Elliptic lib)
  return Buffer.from(tr.serializeBinary());
}

const signPayloadElliptic = (
  payload: Buffer,
): Buffer => {
  const ledgerPrivateKey = process.env.LEDGER_PRIVATE_KEY;

  if (!ledgerPrivateKey) {
    throw new Error('LEDGER_PRIVATE_KEY should be set as a 64 characters long hex string (32 bytes) in .env.local');
  }

  const ec = new EC('secp256k1');

  // privateKey should be a 64 characters long hex string (32 bytes)
  const key = ec.keyFromPrivate(ledgerPrivateKey, 'hex');

  // Hash the payload using SHA-256
  const hash = createHash('sha256');
  hash.update(payload);
  const hashedPayload = hash.digest();

  const signature = key.sign(hashedPayload);

  // Ensure 'r' and 's' are 32 bytes each, pad if necessary
  const r = Buffer.from(signature.r.toString(16).padStart(64, '0'), 'hex');
  const s = Buffer.from(signature.s.toString(16).padStart(64, '0'), 'hex');

  // Concatenate r and s values
  const r_s_signature = Buffer.concat([r, s]);

  return r_s_signature;
};

export async function POST(req: any) {
  const { input }: { input: LedgerSignInput } = await req.json();

  const payload = generatePayload(input);
  const signature = signPayloadElliptic(payload);

  // Return payload and signature as base64url encoded strings
  return NextResponse.json(
    { payload: base64url(payload), signature: base64url(signature) },
  );
}
