# Ledger / Sideshift payload signing debugging


### Method Breakdown

There are two methods of payload generation and signging used here.
Each are respectively based off the example method found in [this repo](https://github.com/LedgerHQ/platform-app-test-exchange), and our own attempts based off the [swap provider documentation](https://developers.ledger.com/docs/swap/howto/providers-endpoints/#protobuf-message-payload).

The payload can be constructed with either **Google Protobuf** or **Protobuf.js**

The signature can be constructed with either **Elliptic** or several crypto libraries, as used in [platform-app-test-exchange](https://github.com/LedgerHQ/platform-app-test-exchange)

The combinations of these methods have been tried here in seperate branches:

#### Copy and paste from example (Google protobuf construction, crypto library signing)
https://github.com/bill0x2A/ledger-sideshift-tx-signing/blob/copy-and-paste/src/app/api/sign-ledger-tx/route.ts
(copy-and-paste)

#### Google protobuf construction with Elliptic signing
https://github.com/bill0x2A/ledger-sideshift-tx-signing/blob/google-payload-elliptic-signing/src/app/api/sign-ledger-tx/route.ts
(google-payload-elliptic-signing)

#### Protobuf.js payload construction with crypto library signing
https://github.com/bill0x2A/ledger-sideshift-tx-signing/blob/protobuf-payload-generation/src/app/api/sign-ledger-tx/route.ts
(protobuf-payload-generation)

#### Protobuf.js payload construction with Elliptic signing
https://github.com/bill0x2A/ledger-sideshift-tx-signing/blob/protobuf-payload-elliptic-signing/src/app/api/sign-ledger-tx/route.ts
(protobuf-payload-elliptic-signing)

All payload construction and signing methods are shown in single files here for debugging.


### Frontend debugging features

The minimal frontend allows the filling of all inputs that go into the payload construction, and call the backend signing functions, with copy and pasted default values from a real RPC call.

There are buttons to call `exchange.start`, `exchange.completeSwap` and construct the payload and signatures.
