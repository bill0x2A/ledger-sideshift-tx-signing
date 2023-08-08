import { LedgerSignInput } from "../types";
import { numberToBigEndianBuffer } from "./helpers";
import protobuf, { Root } from 'protobufjs';

const generateProtobufPayload = (input: LedgerSignInput): Buffer => {
    const PROTOBUF_SCHEMA = `
package ledger_swap;
syntax = "proto3";
message NewTransactionResponse {
    string    payin_address = 1;
    string    payin_extra_id = 2;
    string    refund_address = 3;
    string    refund_extra_id = 4;
    string    payout_address = 5;
    string    payout_extra_id = 6;
    string    currency_from = 7;
    string    currency_to = 8;
    bytes     amount_to_provider = 9;
    bytes     amount_to_wallet = 10;
    string    device_transaction_id = 11;
}
  `;
  
    const { root } = protobuf.parse(PROTOBUF_SCHEMA);
    const NewTransactionResponse = root.lookupType('ledger_swap.NewTransactionResponse');
  
    const proto = NewTransactionResponse.encode(input).finish();
  
    return Buffer.from(proto)
  }
  
  
const generateGooglePayload = (input: LedgerSignInput): Buffer => {
    const tr = new proto.ledger_swap.NewTransactionResponse();
  
    tr.setPayinAddress(input.depositAddress);
    input.depositMemo && tr.setPayinExtraId(input.depositMemo);
    input.refundAddress && tr.setRefundAddress(input.refundAddress);
    input.refundMemo && tr.setRefundExtraId(input.refundMemo);
    tr.setPayoutAddress(input.settleAddress);
    input.settleMemo && tr.setPayoutExtraId(input.settleMemo);
    tr.setCurrencyFrom(input.depositMethodId);
    tr.setCurrencyTo(input.settleMethodId);
    tr.setAmountToProvider(numberToBigEndianBuffer(input.depositAmount));
    tr.setAmountToWallet(numberToBigEndianBuffer(input.settleAmount));
    tr.setDeviceTransactionId(input.deviceTransactionId);
  
    // Serialize payload, return as Buffer
    return Buffer.from(tr.serializeBinary());
  }
  
export { generateGooglePayload, generateProtobufPayload }
