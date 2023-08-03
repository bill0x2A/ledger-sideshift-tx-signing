import base64url from 'base64url';
import { createHash } from 'crypto';
import { ec as EC } from 'elliptic';
import '../lib/protocol_pb.js';

export const numberToBigEndianBuffer = (x: string) => {
  const hex = BigInt(x).toString(16).padStart(32, '0'); // Ensuring 32 hexadecimal digits (16 bytes)

  return Uint8Array.from(Buffer.from(hex, 'hex'));
};

export const generatePayloadAndSignature = (
  data: proto.ledger_swap.NewTransactionResponse,
  privateKey: string
) => {
  const payload = Buffer.from(data.serializeBinary());

  const ec = new EC('secp256k1');

  // privateKey should be a 64 characters long hex string (32 bytes)
  const key = ec.keyFromPrivate(privateKey, 'hex');

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

  const base64UrlPayload = base64url(payload);
  const base64UrlSignature = base64url(r_s_signature);

  return { payload: base64UrlPayload, signature: base64UrlSignature };
};
