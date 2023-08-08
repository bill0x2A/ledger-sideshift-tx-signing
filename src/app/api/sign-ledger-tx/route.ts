import { NextResponse } from 'next/server.js';
import { LedgerSignInput } from '@/app/types.js';
import base64url from 'base64url';
import sha256 from 'js-sha256';
import secp256r1 from 'secp256r1';
import '../../lib/protocol_pb.js';
import protobuf from 'protobufjs';

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

// Based on:
// https://github.com/LedgerHQ/platform-app-test-exchange/blob/main/src/getData/index.ts
const generatePayloadAndSignature = (
  input: LedgerSignInput
) => {
  const ledgerPrivateKey = process.env.LEDGER_PRIVATE_KEY;

  if (!ledgerPrivateKey) {
    throw new Error("Ledger private key not configured");
  }

  // Example constructs this from a Uint8Array, both converted to Buffer so equivalent
  const TEST_PRIVATE_KEY = Buffer.from(ledgerPrivateKey, "hex");

  // Replaced with protobuf payload
  const payload = generateProtobufPayload(input);

  const base64Payload = Buffer.from(base64url(payload));

  const message = Buffer.concat([Buffer.from("."), base64Payload]);
  const digest = Buffer.from(sha256.sha256.array(message));

  const signature = Buffer.from(
    secp256r1.sign(digest, TEST_PRIVATE_KEY).signature
  );

  return { binaryPayload: base64Payload, signature };
};

export async function POST(req: any) {
  const { input }: { input: LedgerSignInput } = await req.json();

  const { binaryPayload, signature } = generatePayloadAndSignature(input);

  // Return payload and signature as base64url encoded strings
  return NextResponse.json(
    { payload: base64url(binaryPayload), signature: base64url(signature) },
  );
}
