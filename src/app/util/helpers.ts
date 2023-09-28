const numberToBigEndianBuffer = (x: string) => {
    const hex = BigInt(x).toString(16).padStart(32, '0'); // Ensuring 32 hexadecimal digits (16 bytes)

    return Uint8Array.from(Buffer.from(hex, 'hex'));
};

const FEE_BYTES = "020da0";
const SIG_DELIM_BYTES = "022100";

const PROCESS_TX_CMD_PREFIX="e0060000b4b0";
const CHECK_TX_SIG_CMD_PREFIX = "e0070000483046";

const generatePayloadAPDU = (serializedPayload: string): string => {
    return `${PROCESS_TX_CMD_PREFIX}${serializedPayload}${FEE_BYTES}`;
};

const generateSignatureCheckAPDU = (signature: string): string => {
    const [first32Bytes, last32Bytes] = [signature.slice(0,32), signature.slice(32)];
    
    return `${CHECK_TX_SIG_CMD_PREFIX}${SIG_DELIM_BYTES}${first32Bytes}${SIG_DELIM_BYTES}${last32Bytes}`;
};

export { numberToBigEndianBuffer, generatePayloadAPDU, generateSignatureCheckAPDU };
