import { NextResponse } from 'next/server.js';
import { LedgerSignInput } from '@/app/types.js';
import base64url from 'base64url';
import { ec as EC } from 'elliptic';
import protobuf from 'protobufjs';
import { createHash } from 'crypto';

// https://developers.ledger.com/docs/swap/howto/providers-endpoints/#protobuf-message-payload
const PROTOBUF_SCHEMA = `
package ledger_swap;
syntax = "proto3";
message NewTransactionResponse {
  string    payin_address = 1;
  string    payin_extra_id = 2;
  string    refund_address = 3;
  string    refund_extra_id = 4;
  string    payout_address = 5;
  string    payout_extra_id = 6;
  string    currency_from = 7;
  string    currency_to = 8;
  bytes     amount_to_provider = 9;
  bytes     amount_to_wallet = 10;
  string    device_transaction_id = 11;
}
`;
 
const generateProtobufPayload = (input: LedgerSignInput): Buffer => {
  const { root } = protobuf.parse(PROTOBUF_SCHEMA);
  const NewTransactionResponse = root.lookupType('ledger_swap.NewTransactionResponse');

  const proto = NewTransactionResponse.encode(input).finish();

  return Buffer.from(proto)
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

  const payload = generateProtobufPayload(input);
  const signature = signPayloadElliptic(payload);

  // Return payload and signature as base64url encoded strings
  return NextResponse.json(
    { payload: base64url(payload), signature: base64url(signature) },
  );
}
