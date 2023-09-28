"use strict";

import * as errors from "@ledgerhq/errors";
import invariant from "invariant";
import * as Swap from "Swap.js";

const TRANSACTION_RATES = {
  FIXED: 0x00,
  FLOATING: 0x01
};

const TRANSACTION_TYPES = {
  SWAP: 0x00,
  SELL: 0x01,
  FUND: 0x02
};

const maybeThrowProtocolError = result => {
  invariant(result.length >= 2, "ExchangeTransport: Unexpected result length");
  const resultCode = result.readUInt16BE(result.length - 2);

  if (resultCode !== 0x9000) {
    throw new errors.TransportStatusError(resultCode);
  }
};

class Exchange {
  constructor(transport, transactionType, transactionRate) {
    this.transport = transport;
    this.transactionType = transactionType;
    this.transactionRate = transactionRate || TRANSACTION_RATES.FIXED;
    this.allowedStatuses = [
      Swap.RESULT.OK,
      Swap.RESULT.INCORRECT_COMMAND_DATA,
      Swap.RESULT.DESERIALIZATION_FAILED,
      Swap.RESULT.WRONG_TRANSACTION_ID,
      Swap.RESULT.INVALID_ADDRESS,
      Swap.RESULT.USER_REFUSED,
      Swap.RESULT.INTERNAL_ERROR,
      Swap.RESULT.CLASS_NOT_SUPPORTED,
      Swap.RESULT.INVALID_INSTRUCTION,
      Swap.RESULT.SIGN_VERIFICATION_FAIL
    ];
  }

  async startNewTransaction() {
    let result = await this.transport.send(0xe0, Swap.COMMAND.START_NEW_TRANSACTION_COMMAND, this.transactionRate, this.transactionType, Buffer.alloc(0), this.allowedStatuses);
    maybeThrowProtocolError(result);

    if (this.transactionType === TRANSACTION_TYPES.SELL || this.transactionType === TRANSACTION_TYPES.FUND) {
      return result.subarray(0, 32).toString("base64");
    }

    return result.toString("ascii", 0, 10);
  }

  async setPartnerKey(partnerNameAndPublicKey) {
    let result = await this.transport.send(0xe0, Swap.COMMAND.SET_PARTNER_KEY_COMMAND, this.transactionRate, this.transactionType, partnerNameAndPublicKey, this.allowedStatuses);
    maybeThrowProtocolError(result);
  }

  async checkPartner(signatureOfPartnerData) {
    let result = await this.transport.send(0xe0, Swap.COMMAND.CHECK_PARTNER_COMMAND, this.transactionRate, this.transactionType, signatureOfPartnerData, this.allowedStatuses);
    maybeThrowProtocolError(result);
  }

  async processTransaction(transaction, fee) {
    var hex = fee.toString(16);
    hex = hex.padStart(hex.length + hex.length % 2, "0");
    var feeHex = Buffer.from(hex, "hex");
    const bufferToSend = Buffer.concat([Buffer.from([transaction.length]), transaction, Buffer.from([feeHex.length]), feeHex]);
    let result = await this.transport.send(0xe0, Swap.COMMAND.PROCESS_TRANSACTION_RESPONSE, this.transactionRate, this.transactionType, bufferToSend, this.allowedStatuses);
    maybeThrowProtocolError(result);
  }

  async checkTransactionSignature(transactionSignature) {
    let result = await this.transport.send(0xe0, Swap.COMMAND.CHECK_TRANSACTION_SIGNATURE, this.transactionRate, this.transactionType, transactionSignature, this.allowedStatuses);
    maybeThrowProtocolError(result);
  }

  async checkPayoutAddress(payoutCurrencyConfig, currencyConfigSignature, addressParameters) {
    invariant(payoutCurrencyConfig.length <= 255, "Currency config is too big");
    invariant(addressParameters.length <= 255, "Address parameter is too big.");
    invariant(currencyConfigSignature.length >= 70 && currencyConfigSignature.length <= 73, "Signature should be DER serialized and have length in [70, 73] bytes.");
    const bufferToSend = Buffer.concat([Buffer.from([payoutCurrencyConfig.length]), payoutCurrencyConfig, currencyConfigSignature, Buffer.from([addressParameters.length]), addressParameters]);
    let result = await this.transport.send(0xe0, this.transactionType === TRANSACTION_TYPES.SWAP ? Swap.COMMAND.CHECK_PAYOUT_ADDRESS : Swap.COMMAND.CHECK_ASSET_IN, this.transactionRate, this.transactionType, bufferToSend, this.allowedStatuses);
    maybeThrowProtocolError(result);
  }

  async checkRefundAddress(refundCurrencyConfig, currencyConfigSignature, addressParameters) {
    invariant(refundCurrencyConfig.length <= 255, "Currency config is too big");
    invariant(addressParameters.length <= 255, "Address parameter is too big.");
    invariant(currencyConfigSignature.length >= 70 && currencyConfigSignature.length <= 73, "Signature should be DER serialized and have length in [70, 73] bytes.");
    const bufferToSend = Buffer.concat([Buffer.from([refundCurrencyConfig.length]), refundCurrencyConfig, currencyConfigSignature, Buffer.from([addressParameters.length]), addressParameters]);
    let result = await this.transport.send(0xe0, Swap.COMMAND.CHECK_REFUND_ADDRESS, this.transactionRate, this.transactionType, bufferToSend, this.allowedStatuses);
    maybeThrowProtocolError(result);
  }

  async signCoinTransaction() {
    let result = await this.transport.send(0xe0, Swap.COMMAND.SIGN_COIN_TRANSACTION, this.transactionRate, this.transactionType, Buffer.alloc(0), this.allowedStatuses);
    maybeThrowProtocolError(result);
  }
}

export default Exchange;
export { TRANSACTION_RATES, TRANSACTION_TYPES };
