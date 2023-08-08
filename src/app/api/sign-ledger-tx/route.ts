import { NextResponse } from 'next/server.js';
import { LedgerSignInput } from '@/app/types.js';
import base64url from 'base64url';
import secp256r1 from 'secp256r1';
import sha256 from 'js-sha256';
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
const generatePayload = (input: LedgerSignInput): proto.ledger_swap.NewTransactionResponse => {
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

  return tr;
}

// Based on:
// https://github.com/LedgerHQ/platform-app-test-exchange/blob/main/src/getData/index.ts
const generatePayloadAndSignature = (
  data: proto.ledger_swap.NewTransactionResponse
) => {
  const ledgerPrivateKey = process.env.LEDGER_PRIVATE_KEY;

  if (!ledgerPrivateKey) {
    throw new Error("Ledger private key not configured");
  }

  // Example constructs this from a Uint8Array, both converted to Buffer so equivalent
  const TEST_PRIVATE_KEY = Buffer.from(ledgerPrivateKey, "hex");

  const payload = Buffer.from(data.serializeBinary());

  const base64Payload = Buffer.from(base64url(payload));

  const message = Buffer.concat([Buffer.from("."), base64Payload]);
  const digest = Buffer.from(sha256.sha256.array(message));

  const signature = Buffer.from(
    secp256r1.sign(digest, TEST_PRIVATE_KEY).signature
  );

  return { binaryPayload: base64Payload, signature };
};


// Return payload and signature as base64url encoded strings
export async function POST(req: any) {
  const { input }: { input: LedgerSignInput } = await req.json();

  const newTransactionResponse = generatePayload(input); 

  const { binaryPayload, signature } = generatePayloadAndSignature(newTransactionResponse);

  return NextResponse.json(
    { payload: base64url(binaryPayload), signature: base64url(signature) }
  );
}
