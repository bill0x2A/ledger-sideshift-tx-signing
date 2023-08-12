import fs from 'fs';
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
    Buffer.from(hex.padStart(hex.length + (hex.length % 2), '0'), 'hex')
  );
};

// https://github.com/LedgerHQ/platform-app-test-exchange/blob/main/src/getData/index.ts
// Based on above, modified to use proto.ledger_swap.NewTransactionResponse (not included in example repo)
const generatePayload = (input: LedgerSignInput) => {
  const tr = new proto.ledger_swap.NewTransactionResponse();

  console.log('Generating payload with input:');
  console.log('\tdepositAddress: ', input.depositAddress);
  console.log('\tdepositMemo:    ', input.depositMemo);
  console.log('\trefundAddress:  ', input.refundAddress);
  console.log('\trefundMemo:     ', input.refundMemo);
  console.log('\tsettleAddress:  ', input.settleAddress);
  console.log('\tsettleMemo:     ', input.settleMemo);
  console.log('\tdepositMethodId:', input.depositMethodId);
  console.log('\tsettleMethodId: ', input.settleMethodId);
  console.log('\tdepositAmount:  ', input.depositAmount);
  console.log('\tsettleAmount:   ', input.settleAmount);
  console.log('\tdeviceTxId:     ', input.deviceTransactionId);

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
};

export async function POST(req: any) {
  const { input }: { input: LedgerSignInput } = await req.json();

  const payload = generatePayload(input);
  fs.writeFileSync('payload.bin', payload);
  console.log('Payload written to payload.bin');
  console.log('Sign with: openssl dgst -sha256 -sign priv.pem payload.bin');

  const { LEDGER_PRIVATE_KEY_HEX } = process.env;

  if (!LEDGER_PRIVATE_KEY_HEX) {
    throw new Error('LEDGER_PRIVATE_KEY_HEX not set');
  }

  const privateKeyRaw = Buffer.from(LEDGER_PRIVATE_KEY_HEX, 'hex');

  if (privateKeyRaw.length !== 32) {
    throw new Error('LEDGER_PRIVATE_KEY_HEX must be 32 bytes');
  }

  const privateKey = new EC('secp256k1').keyFromPrivate(privateKeyRaw);

  const payloadSha256 = createHash('sha256').update(payload).digest();
  console.log('Payload SHA256:');
  console.log(payloadSha256.toString('hex'));
  fs.writeFileSync('payload-sha256.bin', payloadSha256);
  console.log('Payload SHA256 written to payload-sha256.bin');

  const signature = privateKey.sign(payloadSha256); // , { canonical: true });
  console.log('Signature (DER):');
  console.log(signature.toDER('hex'));
  fs.writeFileSync(
    'signature-der.bin',
    Buffer.from(signature.toDER('hex'), 'hex')
  );
  console.log('Signature (DER) written to signature-der.bin');
  console.log(
    'Verify with: openssl dgst -sha256 -verify pub.pem -signature signature-der.bin payload.bin'
  );

  // Ensure 'r' and 's' are 32 bytes each, pad if necessary
  // TODO: Length checks?
  const r = signature.r.toBuffer('be', 32);
  const s = signature.s.toBuffer('be', 32);

  console.log('\tr: ', r.toString('hex'));
  console.log('\ts: ', s.toString('hex'));
  console.log(
    'Verify with openssl asn1parse -inform DER -in signature-der.bin'
  );

  // Concatenate r and s values
  const rsSignature = Buffer.concat([r, s]);
  console.log('Signature (r + s):');
  console.log(rsSignature.toString('hex'));

  // NOTE: This may need to be in base64url format
  const rSignatureEncoded = base64url(rsSignature);

  if (rsSignature.toString('base64') !== rSignatureEncoded) {
    console.warn(
      'WARN: rSignature base64 would not be the same using base64 and base64url'
    );

    console.warn('rSignature base64:     ', rsSignature.toString('base64'));
    console.warn('rSignature base64url:  ', rSignatureEncoded);
  }

  // NOTE: This may need to be in base64url format
  const payloadEncoded = base64url(payload);

  if (payload.toString('base64') !== payloadEncoded) {
    console.warn(
      'WARN: payload base64 would not be the same using base64 and base64url'
    );

    console.warn('payload base64:     ', payload.toString('base64'));
    console.warn('payload base64url: ', payloadEncoded);
  }

  // Return payload and signature as base64url encoded strings
  return NextResponse.json({
    payload: payloadEncoded,
    signature: rSignatureEncoded,
  });
}
