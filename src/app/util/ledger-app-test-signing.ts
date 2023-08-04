import base64url from "base64url";
import secp256r1 from "secp256r1";
import sha256 from "js-sha256";
import { generatePayload } from "./signing";
import "../lib/protocol_pb.js";
import { LedgerSignInput } from "../types";

export const generatePayloadAndSignature = (data: LedgerSignInput) => {
    const ledgerPrivateKey = process.env.LEDGER_PRIVATE_KEY;

    if (!ledgerPrivateKey) {
        throw new Error('Ledger private key not configured');
    }

    const payload = generatePayload(data);
    const base64Payload = Buffer.from(base64url(payload));
  
    const message = Buffer.concat([Buffer.from("."), base64Payload]);
    const digest = Buffer.from(sha256.sha256.array(message));
  
    const signature = Buffer.from(
      secp256r1.sign(digest, Buffer.from(ledgerPrivateKey, 'hex')).signature
    );
  
    return { payload: base64url(base64Payload), signature: base64url(signature) };
  };
