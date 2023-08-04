import base64url from 'base64url';
import { createHash } from 'crypto';
import { ec as EC } from 'elliptic';
import { LedgerSignInput, Options } from '../types.js';
import '../lib/protocol_pb.js';

const numberToBigEndianBuffer = (x: string) => {
  const hex = BigInt(x).toString(16).padStart(32, '0'); // Ensuring 32 hexadecimal digits (16 bytes)

  return Uint8Array.from(Buffer.from(hex, 'hex'));
};

export const generatePayload = (input: LedgerSignInput): Buffer => {
  const tr = new proto.ledger_swap.NewTransactionResponse();

  tr.setPayinAddress(input.depositAddress);
  tr.setPayinExtraId(input.depositMemo ?? '');
  tr.setRefundAddress(input.refundAddress ?? '');
  tr.setRefundExtraId(input.refundMemo ?? '');
  tr.setPayoutAddress(input.settleAddress);
  tr.setPayoutExtraId(input.settleMemo ?? '');
  tr.setCurrencyFrom(input.depositMethodId);
  tr.setCurrencyTo(input.settleMethodId);
  tr.setAmountToProvider(numberToBigEndianBuffer(input.depositAmount));
  tr.setAmountToWallet(numberToBigEndianBuffer(input.settleAmount));
  tr.setDeviceTransactionId(input.deviceTransactionId);

  // Serialize payload, return as Buffer
  return Buffer.from(tr.serializeBinary());
}

// Elliptic curve signing
const signPayload = (
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

export const generatePayloadAndSignature = (input: LedgerSignInput, options: Options) => {
  const ledgerPrivateKey = process.env.LEDGER_PRIVATE_KEY;

  if (!ledgerPrivateKey) {
    throw new Error('Ledger private key not configured');
  }

  const payload = generatePayload(input);
  const signature = signPayload(payload, ledgerPrivateKey, options);

  // Encode payload and signature as base64url
  return {
    payload: base64url(payload),
    signature: base64url(signature),
  };
}
