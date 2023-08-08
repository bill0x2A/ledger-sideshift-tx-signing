const numberToBigEndianBuffer = (x: string) => {
    const hex = BigInt(x).toString(16).padStart(32, '0'); // Ensuring 32 hexadecimal digits (16 bytes)

    return Uint8Array.from(Buffer.from(hex, 'hex'));
};

export { numberToBigEndianBuffer };
