'use client';
import { useState, FormEvent } from 'react';
import {
  Account,
  WalletAPIClient,
  WindowMessageTransport,
} from '@ledgerhq/wallet-api-client';
import { LedgerSignInput, LedgerSignOutput } from './types';
import base64url from 'base64url';
import BigNumber from 'bignumber.js';
import { generatePayloadAPDU, generateSignatureCheckAPDU } from './util/helpers';

const windowMessageTransport = new WindowMessageTransport();
windowMessageTransport.connect();

const ledgerWalletAPIClient = new WalletAPIClient(windowMessageTransport);

const BTC_DEPOSIT_ADDRESS = 'bc1qdevk3wzythwv9t503m4lkujt2xg2esw05w92zq';

const FAKE_LEDGER_ETH_ADDRESS = "0xd692Cb1346262F584D17B4B470954501f6715a82";
const FAKE_LEDGER_BTC_ADDRESS = "bc1qer57ma0fzhqys2cmydhuj9cprf9eg0nw922a8j";
const FAKE_LEDGER_REFUND_ADDRESS = "0xDad77910DbDFdE764fC21FCD4E74D71bBACA6D8D";

const FormInput = ({
  name,
  value,
  onChange,
  required,
}: {
  name: string;
  value?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) => (
  <label style={{ marginBottom: '12px', display: 'block', width: '20rem' }}>
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
  <label style={{ marginBottom: '12px', display: 'block', width: '20rem' }}>
    <p style={{ width: '30rem', marginBottom: '5px' }}>{name}:</p>
    <input
      type="text"
      style={{ height: '2rem', width: '100%', marginLeft: '0.2rem' }}
      name={name}
      value={value}
      readOnly
    />
  </label>
);

export default function Home() {
  const [selectedDepositAccount, setSelectedDepositAccount] =
    useState<Account | null>(null);
  const [selectedSettleAccount, setSelectedSettleAccount] =
    useState<Account | null>(null);

  const [input, setInput] = useState<LedgerSignInput>({
    depositAddress: FAKE_LEDGER_ETH_ADDRESS,
    depositMemo: undefined,
    refundAddress: FAKE_LEDGER_REFUND_ADDRESS,
    refundMemo: undefined,
    settleAddress: FAKE_LEDGER_BTC_ADDRESS,
    settleMemo: undefined,
    depositAmount: '10000',
    settleAmount: '11464990000000000',
    depositMethodId: 'bitcoin',
    settleMethodId: 'ethereum',
    deviceTransactionId: 'QQQQQQQQQQ',
  });

  console.log(input.depositMethodId, input.settleMethodId);

  const [result, setResult] = useState<LedgerSignOutput | null>(null);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setInput((prevInput) => ({ ...prevInput, [name]: value }));
  };

  const handleStartTransaction = async () => {
    const deviceTxId = await ledgerWalletAPIClient.exchange.start('SWAP');
    setInput((prevInput) => ({
      ...prevInput,
      deviceTransactionId: deviceTxId,
    }));

    return deviceTxId;
  };

  const handleCompleteTransaction = async () => {
    if (!result || !selectedDepositAccount || !selectedSettleAccount) return;

    console.log(
      'calling ledgerWalletAPIClient.exchange.completeSwap with args'
    );
    console.dir({
      provider: 'ssaitest',
      fromAccountId: selectedDepositAccount.id,
      toAccountId: selectedSettleAccount.id,
      transaction: {
        amount: BigNumber(input.depositAmount) as any,
        recipient: input.depositAddress,
        family: 'bitcoin',
      },
      binaryPayload: base64url.toBuffer(result.payload),
      signature: base64url.toBuffer(result.signature),
      feeStrategy: 'MEDIUM',
    });

    const txId = await ledgerWalletAPIClient.exchange.completeSwap({
      provider: 'ssaitest',
      fromAccountId: selectedDepositAccount.id,
      toAccountId: selectedSettleAccount.id,
      transaction: {
        amount: BigNumber(input.depositAmount) as any,
        recipient: input.depositAddress,
        family: 'ethereum',
      },
      binaryPayload: base64url.toBuffer(result.payload),
      signature: base64url.toBuffer(result.signature),
      feeStrategy: 'MEDIUM',
    });

    console.log(txId);
  };

  const handleSelectDepositAccount = async () => {
    const selectedLedgerAccount = await ledgerWalletAPIClient.account.request({
      currencyIds: ['ethereum'],
    });

    setSelectedDepositAccount(selectedLedgerAccount);

    setInput({
      ...input,
      refundAddress: selectedLedgerAccount.address,
      depositMethodId: selectedLedgerAccount.currency,
    });
  };

  const handleSelectSettleAccount = async () => {
    const selectedLedgerAccount = await ledgerWalletAPIClient.account.request({
      currencyIds: ['bitcoin'],
    });

    setSelectedSettleAccount(selectedLedgerAccount);

    setInput({
      ...input,
      settleAddress: selectedLedgerAccount.address,
      settleMethodId: selectedLedgerAccount.currency,
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    console.log('INPUT FROM FRONTEND');
    console.dir(input);

    const res = await fetch('/api/sign-ledger-tx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input,
      }),
    });

    const data: LedgerSignOutput = await res.json();

    console.log('RAW DATA FROM BACKEND');
    console.dir(data);

    setResult(data);
  };

  return (
    <div style={{ margin: '0 auto', padding: '1rem 2rem' }}>
      <h2 style={{ marginBottom: '1rem' }}>
        Sideshift Ledger Payload Generation Testing
      </h2>
      <div style={{ display: 'flex', gap: '2rem' }}>
        <form style={{ width: '20rem' }} onSubmit={handleSubmit}>
          <FormInput
            name="depositAddress"
            value={input.depositAddress}
            onChange={handleInputChange}
            required
          />
          <FormInput
            name="depositMemo"
            value={input.depositMemo}
            onChange={handleInputChange}
          />
          <FormInput
            name="refundAddress"
            value={input.refundAddress}
            onChange={handleInputChange}
            required
          />
          <FormInput
            name="refundMemo"
            value={input.refundMemo}
            onChange={handleInputChange}
          />
          <FormInput
            name="settleAddress"
            value={input.settleAddress}
            onChange={handleInputChange}
            required
          />
          <FormInput
            name="settleMemo"
            value={input.settleMemo}
            onChange={handleInputChange}
          />
          <FormInput
            name="depositMethodId"
            value={input.depositMethodId}
            onChange={handleInputChange}
            required
          />
          <FormInput
            name="settleMethodId"
            value={input.settleMethodId}
            onChange={handleInputChange}
            required
          />
          <FormInput
            name="depositAmount"
            value={input.depositAmount}
            onChange={handleInputChange}
            required
          />
          <FormInput
            name="settleAmount"
            value={input.settleAmount}
            onChange={handleInputChange}
            required
          />
          <FormInput
            name="deviceTransactionId"
            value={input.deviceTransactionId}
            onChange={handleInputChange}
            required
          />
          <button
            style={{ width: '20rem', height: '2rem', marginTop: '20px' }}
            type="button"
            onClick={handleSelectDepositAccount}
          >
            Select Deposit Account
          </button>
          <button
            style={{ width: '20rem', height: '2rem', marginTop: '20px' }}
            type="button"
            onClick={handleSelectSettleAccount}
          >
            Select Settle Account
          </button>
          <button
            disabled={!selectedDepositAccount || !selectedSettleAccount}
            style={{ width: '20rem', height: '2rem', marginTop: '20px' }}
            type="button"
            onClick={handleStartTransaction}
          >
            Start Transaction
          </button>
          <button
            style={{ width: '20rem', height: '2rem', marginTop: '20px' }}
            type="submit"
          >
            Generate payload and signature
          </button>
          <button
            disabled={!result}
            style={{ width: '20rem', height: '2rem', marginTop: '20px' }}
            type="button"
            onClick={handleCompleteTransaction}
          >
            Complete Transaction
          </button>
        </form>
        <div>
          <DisplayInput
            name="Payload (base64url)"
            value={result?.payload || ''}
          />
          <DisplayInput
            name="Signature (base64url)"
            value={result?.signature || ''}
          />
          <DisplayInput
            name="Payload (hex):"
            value={
              result
                ? Buffer.from(result?.payload, 'base64').toString('hex')
                : ''
            }
          />
          <DisplayInput
            name="Signature (hex)"
            value={
              result
                ? Buffer.from(result?.signature, 'base64').toString('hex')
                : ''
            }
          />
          <DisplayInput
            name="CHECK_SIGNATURE_APDU"
            value={
              result
                ? generateSignatureCheckAPDU(Buffer.from(result?.signature, 'base64').toString('hex'))
                : ''
            }
          />
          <DisplayInput
            name="START_TRANSACTION_APDU"
            value={
              result
                ? generatePayloadAPDU(Buffer.from(result?.payload, 'base64').toString('hex'))
                : ''
            }
          />
        </div>
      </div>
    </div>
  );
}
