"use client";
import { useState, FormEvent } from 'react';

type LedgerSignInput = {
  depositAddress: string;
  depositMemo?: string;
  refundAddress?: string;
  refundMemo?: string;
  settleAddress: string;
  settleMemo?: string;
  depositMethodId: string;
  settleMethodId: string;
  depositAmount: string;
  settleAmount: string;
  deviceTransactionId: string;
};

type LedgerSignOutput = {
  payload: string;
  signature: string;
};

const FormInput = (
  { name, value, onChange, required }:
  { name: string; value?: string; onChange: (event: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean }) => (
  <label style={{ marginBottom: '12px', display: "block", width: "20rem" }}>
    <p style={{ width: '30rem', marginBottom: '5px' }}>{name}:</p> 
    <input
      type="text"
      style={{ height: '2rem', width: '100%', marginLeft: '0.2rem' }}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
    />
  </label>
);

const DisplayInput = ({ name, value }: { name: string; value: string }) => (
  <label style={{ marginBottom: '12px', display: "block", width: "20rem" }}>
  <p style={{ width: '30rem', marginBottom: '5px' }}>{name}:</p> 
  <input
    type="text"
    style={{ height: '2rem', width: '100%', marginLeft: '0.2rem' }}
    name={name}
    value={value}
    readOnly
  />
</label>
)

export default function Home () {
  const [input, setInput] = useState<LedgerSignInput>({
    depositAddress: '1c01c682c3b9db5b2866f6b4ecde61e9bd58edf8dd718b98ac2dd1fabd646626',
    depositMemo: undefined,
    refundAddress: '46a678f6c4e36674409c3c0f91ac06da506fa8fafe0dce0673a73595b87a3539',
    refundMemo: undefined,
    settleAddress: '0xaE984C089B358326bF35555c8C7F29B0E8843B96',
    settleMemo: undefined,
    depositAmount: '16000000000000000000000000',
    settleAmount: '11464990000000000',
    depositMethodId: 'near',
    settleMethodId: 'ethereum',
    deviceTransactionId: 'RIBBJBWMEG'
  });

  const [result, setResult] = useState<LedgerSignOutput | null>(null);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setInput((prevInput) => ({ ...prevInput, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    console.log("INPUT FROM FRONTEND");
    console.dir(input);

    const res = await fetch('/api/sign-ledger-tx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
    });

    const data: LedgerSignOutput = await res.json();

    console.log("RAW DATA FROM BACKEND");
    console.dir(data);

    setResult(data);
  };

  return (
    <div style={{ margin: "0 auto", padding: "1rem 2rem" }}>
      <h2 style={{ marginBottom: "1rem" }}>Sideshift Ledger Payload Generation Testing</h2>
      <div style={{ display: 'flex', gap: '2rem' }}>
        <form style={{ width: "20rem" }} onSubmit={handleSubmit}>
          <FormInput name="depositAddress" value={input.depositAddress} onChange={handleInputChange} required />
          <FormInput name="depositMemo" value={input.depositMemo} onChange={handleInputChange} />
          <FormInput name="refundAddress" value={input.refundAddress} onChange={handleInputChange} required />
          <FormInput name="refundMemo" value={input.refundMemo} onChange={handleInputChange} />
          <FormInput name="settleAddress" value={input.settleAddress} onChange={handleInputChange} required />
          <FormInput name="settleMemo" value={input.settleMemo} onChange={handleInputChange} />
          <FormInput name="depositMethodId" value={input.depositMethodId} onChange={handleInputChange} required />
          <FormInput name="settleMethodId" value={input.settleMethodId} onChange={handleInputChange} required />
          <FormInput name="depositAmount" value={input.depositAmount} onChange={handleInputChange} required />
          <FormInput name="settleAmount" value={input.settleAmount} onChange={handleInputChange} required />
          <FormInput name="deviceTransactionId" value={input.deviceTransactionId} onChange={handleInputChange} required />
          <button style={{width: "20rem"}} type="submit">Generate payload and signature</button>
        </form>
        <div>
          <DisplayInput name="Payload (base64url)" value={result?.payload || ''}/>
          <DisplayInput name="Signature (base64url)" value={result?.signature || ''}/>
          <DisplayInput name="Payload (hex):" value={result ? Buffer.from(result?.payload, 'base64').toString('hex') : ''}/>
          <DisplayInput name="Signature (hex)" value={result ? Buffer.from(result?.signature, 'base64').toString('hex'): ''}/>
        </div>
      </div>
    </div>
  );
};

