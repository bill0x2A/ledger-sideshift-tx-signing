"use client";
import { useState, FormEvent } from 'react';
import { Account, WalletAPIClient, WindowMessageTransport } from '@ledgerhq/wallet-api-client';
import { LedgerSignInput, LedgerSignOutput } from './types';
import base64url from 'base64url';
import BigNumber from 'bignumber.js';

const windowMessageTransport = new WindowMessageTransport();
windowMessageTransport.connect();

const ledgerWalletAPIClient = new WalletAPIClient(windowMessageTransport);

const BTC_DEPOSIT_ADDRESS = "345yX9SPGGMnyVXHrgfbBvJ1RmughLnHGh";

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
    depositAddress: BTC_DEPOSIT_ADDRESS,
    depositMemo: undefined,
    refundAddress: BTC_DEPOSIT_ADDRESS,
    refundMemo: undefined,
    settleAddress: '0xaE984C089B358326bF35555c8C7F29B0E8843B96',
    settleMemo: undefined,
    depositAmount: '10000',
    settleAmount: '11464990000000000',
    depositMethodId: 'btc',
    settleMethodId: 'ethereum',
    deviceTransactionId: ''
  });

  const [selectedDepositAccount, setSelectedDepositAccount] = useState<Account | null>(null);
  const [selectedSettleAccount, setSelectedSettleAccount] = useState<Account | null>(null);

  const [result, setResult] = useState<LedgerSignOutput | null>(null);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setInput((prevInput) => ({ ...prevInput, [name]: value }));
  };

  const handleStartTransaction = async () => {
    const deviceTxId = await ledgerWalletAPIClient.exchange.start("SWAP");
    setInput((prevInput) => ({ ...prevInput, deviceTransactionId: deviceTxId }));

    return deviceTxId;
  }

  const handleCompleteTransaction = async () => {
    if (!result || !selectedDepositAccount || !selectedSettleAccount) return;
  
    const txId = await ledgerWalletAPIClient.exchange.completeSwap({
      provider: 'ssaitest',
      fromAccountId: selectedDepositAccount.id,
      toAccountId: selectedSettleAccount.id,
      transaction: {
        amount: BigNumber(input.depositAmount) as any,
        recipient: BTC_DEPOSIT_ADDRESS,
        family: "bitcoin",
      },
      binaryPayload: base64url.toBuffer(result.payload),
      signature: base64url.toBuffer(result.signature),
      feeStrategy: 'MEDIUM',
    });
  }

  const handleSelectDepositAccount = async () => {
    const selectedLedgerAccount = await ledgerWalletAPIClient.account.request({
      currencyIds: ['bitcoin'],
    });

    setSelectedDepositAccount(selectedLedgerAccount);
  };

  const handleSelectSettleAccount = async () => {
    const selectedLedgerAccount = await ledgerWalletAPIClient.account.request({
      currencyIds: ['ethereum'],
    });

    setSelectedSettleAccount(selectedLedgerAccount);
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
      body: JSON.stringify({ input: {
        ...input,
        refundAddess: selectedDepositAccount?.address,
        settleAddress: selectedSettleAccount?.address,
      }})
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
          <button style={{ width: "20rem", height: "2rem", marginTop: '20px' }} type="button" onClick={handleSelectDepositAccount}>Select Deposit Account</button>
          <button style={{ width: "20rem", height: "2rem", marginTop: '20px' }} type="button" onClick={handleSelectSettleAccount}>Select Settle Account</button>
          <button disabled={!selectedDepositAccount || !selectedSettleAccount} style={{ width: "20rem", height: "2rem", marginTop: '20px' }} type="button" onClick={handleStartTransaction}>Start Transaction</button>
          <button disabled={!selectedDepositAccount || !selectedSettleAccount || !input.deviceTransactionId} style={{ width: "20rem", height: "2rem", marginTop: '20px' }} type="submit">Generate payload and signature</button>
          <button disabled={!result} style={{ width: "20rem", height: "2rem", marginTop: '20px' }} type="button" onClick={handleCompleteTransaction}>Complete Transaction</button>
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