import base64url from 'base64url';
import { createHash } from 'crypto';
import { ec as EC } from 'elliptic';
import secp256r1 from "secp256r1";
import sha256 from "js-sha256";
import { generateGooglePayload, generateProtobufPayload } from './payloadGeneration.js';
import { LedgerSignInput, Options } from '../types.js';
import '../lib/protocol_pb.js';

const signPayloadElliptic = (
  payload: Buffer,
  privateKey: string,
  { shouldHash = true }: { shouldHash?: boolean },
): Buffer => {
  const ec = new EC('secp256k1');

  // privateKey should be a 64 characters long hex string (32 bytes)
  const key = ec.keyFromPrivate(privateKey, 'hex');

  // Hash the payload using SHA-256
  const hash = createHash('sha256');
  hash.update(payload);
  const hashedPayload = hash.digest();

  const signature = key.sign(shouldHash ? hashedPayload : payload);

  // Ensure 'r' and 's' are 32 bytes each, pad if necessary
  const r = Buffer.from(signature.r.toString(16).padStart(64, '0'), 'hex');
  const s = Buffer.from(signature.s.toString(16).padStart(64, '0'), 'hex');

  // Concatenate r and s values
  const r_s_signature = Buffer.concat([r, s]);

  return r_s_signature;
};

export const signPayload = (payload: Buffer, privateKey: string) => {
  const message = Buffer.concat([Buffer.from("."), payload]);
  const digest = Buffer.from(sha256.sha256.array(message));

  const signature = Buffer.from(
    secp256r1.sign(digest, Buffer.from(privateKey, 'hex')).signature
  );

  return signature;
};

export const generatePayloadAndSignature = (input: LedgerSignInput, options: Options) => {
  const ledgerPrivateKey = process.env.LEDGER_PRIVATE_KEY;

  if (!ledgerPrivateKey) {
    throw new Error('Ledger private key not configured');
  }

  const payload = options.googlePayloadGeneration ? generateProtobufPayload(input) : generateGooglePayload(input);

  const signature = options.copyAndPastedSigningMethod ? signPayload(payload, ledgerPrivateKey) : signPayloadElliptic(payload, ledgerPrivateKey, options);

  // Encode payload and signature as base64url
  return {
    payload: base64url(payload),
    signature: base64url(signature),
  };
}
