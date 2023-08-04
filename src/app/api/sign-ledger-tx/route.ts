import '../../lib/protocol_pb.js';
import { generatePayloadAndSignature } from '../../util/signing';
import { generatePayloadAndSignature as copyAndPastedGeneratePayloadAndSignature } from '../../util/ledger-app-test-signing';
import { NextResponse } from 'next/server.js';
import { LedgerSignInput, Options } from '@/app/types.js';

export async function POST(req: any) {
  const { input, options }: { input: LedgerSignInput, options: Options } = await req.json();

  const { payload, signature } = options.copyAndPastedSigningMethod ? copyAndPastedGeneratePayloadAndSignature(input) : generatePayloadAndSignature(input, options);

  return NextResponse.json(
    { payload, signature }
  );
}
