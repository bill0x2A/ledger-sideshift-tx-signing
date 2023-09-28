import fs from 'fs';
import { NextResponse } from 'next/server.js';
import { LedgerSignInput } from '@/app/types.js';
import base64url from 'base64url';
import { ec as EC } from 'elliptic';
import { createHash } from 'crypto';
import '../../lib/protocol_pb.js';
import protobuf from 'protobufjs';

const PYTHON_BACKEND_URL = 'http://localhost:5000/api/sign';

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

  console.log('NewTransactionResponse:');
  console.log(tr.toObject());

  // Serialize protobuf, return as buffer (modified from example to be compatible with Elliptic lib)
  const serialized = Buffer.from(tr.serializeBinary());

  return serialized;
};

export async function POST(req: any) {
  const { input }: { input: LedgerSignInput } = await req.json();

  let payload = generatePayload(input);
  fs.writeFileSync('payload.bin', payload);
  console.log('Payload written to payload.bin');
  console.log('Sign with: openssl dgst -sha256 -sign priv.pem payload.bin');

  // const response = await fetch(PYTHON_BACKEND_URL, {
  //   method: 'POST',
  //   headers: {
  //       'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({ data: payload.toString('base64') })
  //   });

  //   if (!response.ok) {
  //       throw new Error("Network response was not ok");
  //   }

  //   const data = await response.json();
  //   const signature: string = data.signature;

  // Decode with protobuf.js to ensure fields are correct
  await new Promise<void>((resolve, reject) => {
    protobuf.load(
      __dirname + '../../../../../../proto/NewTransactionResponse.proto',
      (err, root) => {
        if (err) {
          reject(err);
        }

        const NewTransactionResponse = root!.lookupType(
          'ledger_swap.NewTransactionResponse'
        );

        const errMsg = NewTransactionResponse.verify(payload);

        if (errMsg) {
          reject(new Error(errMsg));
        }

        const message = NewTransactionResponse.decode(payload);

        console.log('NewTransactionResponse (decoded with protobuf.js):');
        console.log(NewTransactionResponse.toObject(message));

        resolve();
      }
    );
  });

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
  const signatureEncoded = base64url(rsSignature);

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
    signature: signatureEncoded,
  });
}
