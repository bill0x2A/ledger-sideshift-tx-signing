const numberToBigEndianBuffer = (x: string) => {
    const hex = BigInt(x).toString(16).padStart(32, '0'); // Ensuring 32 hexadecimal digits (16 bytes)

    return Uint8Array.from(Buffer.from(hex, 'hex'));
};

const FEE_BYTES = "020da0";
const SIG_DELIM_BYTES = "022100";

const PROCESS_TX_CMD_PREFIX="e0060000b4b0";
const CHECK_TX_SIG_CMD_PREFIX = "e0070000";

const DER_INT_IND = "02";
const DER_SEQ_IND = "30";

const generatePayloadAPDU = (serializedPayload: string): string => {
    return PROCESS_TX_CMD_PREFIX + serializedPayload + FEE_BYTES;
};

const generateSignatureCheckAPDU = (signature: string): string => {
    if (signature.length !== 128) {
        throw new Error('Invalid signature length');
    }

    // Extract R and S components from the signature
    const r = signature.slice(0, 64);
    const s = signature.slice(64, 128);

    // Ensure R and S are interpreted as positive values
    const rVal = (parseInt(r.substring(0, 2), 16) >= 0x80) ? `00${r}` : r;
    const sVal = (parseInt(s.substring(0, 2), 16) >= 0x80) ? `00${s}` : s;

    // Calculate lengths
    const rLen = (rVal.length / 2).toString(16).padStart(2, '0');
    const sLen = (sVal.length / 2).toString(16).padStart(2, '0');

    const totalDataLength = ((rVal.length + sVal.length) / 2 + 6).toString(16).padStart(2, '0');
    const totalDerLength = ((rVal.length + sVal.length) / 2 + 4).toString(16).padStart(2, '0');

    // Construct the APDU
    return CHECK_TX_SIG_CMD_PREFIX + totalDataLength + DER_SEQ_IND + totalDerLength + DER_INT_IND + rLen + rVal + DER_INT_IND + sLen + sVal;
};


export { numberToBigEndianBuffer, generatePayloadAPDU, generateSignatureCheckAPDU };
