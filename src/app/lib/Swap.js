"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.RESULT = exports.COMMAND = void 0;

var _bignumber = require("bignumber.js");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const COMMAND = {
  GET_VERSION_COMMAND: 0x02,
  START_NEW_TRANSACTION_COMMAND: 0x03,
  SET_PARTNER_KEY_COMMAND: 0x04,
  CHECK_PARTNER_COMMAND: 0x05,
  PROCESS_TRANSACTION_RESPONSE: 0x06,
  CHECK_TRANSACTION_SIGNATURE: 0x07,
  CHECK_PAYOUT_ADDRESS: 0x08,
  CHECK_ASSET_IN: 0x08,
  // For SELL command, same as CHECK_PAYOUT_ADDRESS actually
  CHECK_REFUND_ADDRESS: 0x09,
  SIGN_COIN_TRANSACTION: 0x0A
};
exports.COMMAND = COMMAND;
const RESULT = {
  OK: 0x9000,
  INCORRECT_COMMAND_DATA: 0x6A80,
  DESERIALIZATION_FAILED: 0x6A81,
  WRONG_TRANSACTION_ID: 0x6A82,
  INVALID_ADDRESS: 0x6A83,
  USER_REFUSED: 0x6A84,
  INTERNAL_ERROR: 0x6A85,
  CLASS_NOT_SUPPORTED: 0x6E00,
  INVALID_INSTRUCTION: 0x6D00,
  SIGN_VERIFICATION_FAIL: 0x9D1A
};
exports.RESULT = RESULT;

class Swap {
  constructor(transport) {
    _defineProperty(this, "transport", void 0);

    _defineProperty(this, "allowedStatuses", void 0);

    this.transport = transport;
    this.allowedStatuses = [RESULT.OK, RESULT.INCORRECT_COMMAND_DATA, RESULT.DESERIALIZATION_FAILED, RESULT.WRONG_TRANSACTION_ID, RESULT.INVALID_ADDRESS, RESULT.USER_REFUSED, RESULT.INTERNAL_ERROR, RESULT.CLASS_NOT_SUPPORTED, RESULT.INVALID_INSTRUCTION, RESULT.SIGN_VERIFICATION_FAIL];
  }

  isSuccess(result) {
    return result.length >= 2 && result.readUInt16BE(result.length - 2) == 0x9000;
  }

  mapProtocolError(result) {
    if (result.length < 2) throw new Error("Response length is too small");
    var errorMessage;

    switch (result.readUInt16BE(result.length - 2)) {
      case RESULT.INCORRECT_COMMAND_DATA:
        errorMessage = "INCORRECT_COMMAND_DATA";
        break;

      case RESULT.DESERIALIZATION_FAILED:
        errorMessage = "DESERIALIZATION_FAILED";
        break;

      case RESULT.WRONG_TRANSACTION_ID:
        errorMessage = "WRONG_TRANSACTION_ID";
        break;

      case RESULT.INVALID_ADDRESS:
        errorMessage = "INVALID_ADDRESS";
        break;

      case RESULT.USER_REFUSED:
        errorMessage = "USER_REFUSED";
        break;

      case RESULT.INTERNAL_ERROR:
        errorMessage = "INTERNAL_ERROR";
        break;

      case RESULT.CLASS_NOT_SUPPORTED:
        errorMessage = "CLASS_NOT_SUPPORTED";
        break;

      case RESULT.INVALID_INSTRUCTION:
        errorMessage = "INVALID_INSTRUCTION";
        break;

      case RESULT.SIGN_VERIFICATION_FAIL:
        errorMessage = "SIGN_VERIFICATION_FAIL";
        break;

      default:
        errorMessage = "Unknown error";
        break;
    }

    throw new Error("Swap application report error " + errorMessage);
  }

  async getVersion() {
    const result = await this.transport.send(0xE0, COMMAND.GET_VERSION_COMMAND, 0x00, 0x00, Buffer(0), this.allowedStatuses);
    if (!this.isSuccess(result)) this.mapProtocolError(result);
    return result;
  }

  async startNewTransaction() {
    const result = await this.transport.send(0xE0, COMMAND.START_NEW_TRANSACTION_COMMAND, 0x00, 0x00, Buffer(0), this.allowedStatuses);
    if (!this.isSuccess(result)) this.mapProtocolError(result);
    if (result.length != 12) throw new Error("APDU response length should be 12");
    const transactionId = result.toString("ascii", 0, 10);
    return transactionId;
  }

  async setPartnerKey(partnerNameAndPublicKey) {
    const result = await this.transport.send(0xE0, COMMAND.SET_PARTNER_KEY_COMMAND, 0x00, 0x00, partnerNameAndPublicKey, this.allowedStatuses);
    if (!this.isSuccess(result)) this.mapProtocolError(result);
  }

  async checkPartner(signatureOfPartnerData) {
    const result = await this.transport.send(0xE0, COMMAND.CHECK_PARTNER_COMMAND, 0x00, 0x00, signatureOfPartnerData, this.allowedStatuses);
    if (!this.isSuccess(result)) this.mapProtocolError(result);
  }

  async processTransaction(transaction, fee) {
    var hex = fee.toString(16);
    hex = hex.padStart(hex.length + hex.length % 2, '0');
    var feeHex = Buffer.from(hex, 'hex');
    const bufferToSend = Buffer.concat([Buffer.from([transaction.length]), transaction, Buffer.from([feeHex.length]), feeHex]);
    console.log(bufferToSend.toString("hex"));
    const result = await this.transport.send(0xE0, COMMAND.PROCESS_TRANSACTION_RESPONSE, 0x00, 0x00, bufferToSend, this.allowedStatuses);
    if (!this.isSuccess(result)) this.mapProtocolError(result);
  }

  async checkTransactionSignature(transactionSignature) {
    const result = await this.transport.send(0xE0, COMMAND.CHECK_TRANSACTION_SIGNATURE, 0x00, 0x00, transactionSignature, this.allowedStatuses);
    if (!this.isSuccess(result)) this.mapProtocolError(result);
  }

  async checkPayoutAddress(payoutCurrencyConfig, currencyConfigSignature, addressParameters) {
    if (payoutCurrencyConfig.length > 255) {
      throw new Error("Currency config is too big");
    }

    if (currencyConfigSignature.length < 70 || currencyConfigSignature.length > 73) {
      throw new Error("Signature should be DER serialized and have length in [70, 73] bytes");
    }

    if (addressParameters.length > 255) {
      throw new Error("Address parameters is too big");
    }

    const bufferToSend = Buffer.concat([Buffer.from([payoutCurrencyConfig.length]), payoutCurrencyConfig, currencyConfigSignature, Buffer.from([addressParameters.length]), addressParameters]);
    const result = await this.transport.send(0xE0, COMMAND.CHECK_PAYOUT_ADDRESS, 0x00, 0x00, bufferToSend, this.allowedStatuses);
    if (!this.isSuccess(result)) this.mapProtocolError(result);
  }

  async checkRefundAddress(refundCurrencyConfig, currencyConfigSignature, addressParameters) {
    if (refundCurrencyConfig.length > 255) {
      throw new Error("Currency config is too big");
    }

    if (currencyConfigSignature.length < 70 || currencyConfigSignature.length > 73) {
      throw new Error("Signature should be DER serialized and have length in [70, 73] bytes");
    }

    if (addressParameters.length > 255) {
      throw new Error("Address parameters is too big");
    }

    const bufferToSend = Buffer.concat([Buffer.from([refundCurrencyConfig.length]), refundCurrencyConfig, currencyConfigSignature, Buffer.from([addressParameters.length]), addressParameters]);
    const result = await this.transport.send(0xE0, COMMAND.CHECK_REFUND_ADDRESS, 0x00, 0x00, bufferToSend, this.allowedStatuses);
    if (!this.isSuccess(result)) this.mapProtocolError(result);
  }

  async signCoinTransaction() {
    const result = await this.transport.send(0xE0, COMMAND.SIGN_COIN_TRANSACTION, 0x00, 0x00, Buffer(0), this.allowedStatuses);
    if (!this.isSuccess(result)) this.mapProtocolError(result);
  }

}

exports.default = Swap;