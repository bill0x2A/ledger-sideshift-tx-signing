import { NextResponse } from 'next/server.js';
import { LedgerSignInput } from '@/app/types.js';
import base64url from 'base64url';
import { ec as EC } from 'elliptic';
import crypto from 'crypto';
import sha256 from 'js-sha256';
import secp256r1 from 'secp256r1';
import secp256k1 from 'secp256k1';
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
const generatePayload = (input: LedgerSignInput) => {
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

const signPayload = (payload: Buffer) => {
  const pk = process.env.LEDGER_PRIVATE_KEY_HEX_ARRAY?.split(':').map(x => parseInt(x, 16))

  const base64Payload = payload.toString('base64');

  const signer = crypto.createSign('SHA256');

  signer.update(payload);

  const message = Buffer.concat([Buffer.from('.'), Buffer.from(base64Payload)]);
  const digest = Buffer.from(sha256.sha256.array(message));

  const signature = base64url(Buffer.from(secp256r1.sign(digest, Buffer.from(pk!)).signature));

  return signature;
}

const signPayload1 = (payload: Buffer) => {
  const privateKey = Buffer.from('9b5e8d84d76d35f5a7776638e7a57e48cf36b87bfefc51e57f73fff0c299c978', 'hex');

  const message = Buffer.concat([Buffer.from('.'), payload]);
  const digest = crypto.createHash('sha256').update(message).digest();

  const { signature } = secp256k1.ecdsaSign(digest, privateKey);

  return base64url(Buffer.from(signature));
}


const signPayloadElliptic = (
  
  payload: Buffer,
): Buffer => {
  const ledgerPrivateKey = process.env.LEDGER_PRIVATE_KEY_HEX;

  if (!ledgerPrivateKey) {
    throw new Error('LEDGER_PRIVATE_KEY should be set as a 64 characters long hex string (32 bytes) in .env.local');
  }


  const ec = new EC('secp256k1');

  // privateKey should be a 64 characters long hex string (32 bytes)
  const key = ec.keyFromPrivate(ledgerPrivateKey, 'hex');

  // Hash the payload using SHA-256
  const hash = crypto.createHash('sha256');
  hash.update(payload);
  const hashedPayload = hash.digest();

  const signature = key.sign(hashedPayload);

  // Ensure 'r' and 's' are 32 bytes each, pad if necessary
  const r = signature.r.toBuffer('be', 32);
const s = signature.s.toBuffer('be', 32);

  // Concatenate r and s values
  const r_s_signature = Buffer.concat([r, s]);

  console.log(base64url(r_s_signature).length)

  return r_s_signature;
};

const signPayload2 = (payload: Buffer) => {
  const ledgerPrivateKey = process.env.LEDGER_PRIVATE_KEY_BASE64;

  if(!ledgerPrivateKey){
    throw new Error('missing pk')
  }

  const signer = crypto.createSign('SHA256');

  signer.update(payload);

  const privateKey = `-----BEGIN EC PRIVATE KEY-----
${ledgerPrivateKey}
-----END EC PRIVATE KEY-----`;

  const signature = signer.sign(privateKey, 'base64');

  return Buffer.from(signature);
}

const base64url2 = (input: Uint8Array) => {
  const base64 = Buffer.from(input).toString('base64');
  return base64
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const generateSignature = (payload: Buffer) => {
  const privateKey = process.env.LEDGER_PRIVATE_KEY_HEX;
  const ellipticCurve = new EC('p256');
  const keyPair = ellipticCurve.keyFromPrivate(privateKey!, 'hex');
  const hash = crypto.createHash('sha256').update(payload).digest();
  const signature = keyPair.sign(hash);
  const r = signature.r.toArray('be', 32);
  const s = signature.s.toArray('be', 32);
  const signatureBuffer = Buffer.concat([Buffer.from(r), Buffer.from(s)]);
  return base64url2(signatureBuffer);
};

export async function POST(req: any) {
  const { input }: { input: LedgerSignInput } = await req.json();

  const payload = generatePayload(input);
  const signature = signPayload(payload);


  // Return payload and signature as base64url encoded strings
  return NextResponse.json(
    { payload: base64url(Buffer.from(payload)), signature },
  );
}
