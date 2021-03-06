# Migration `20201013125322-init`

This migration has been generated by Rahul Sethuram at 10/13/2020, 2:53:22 PM.
You can check out the [state of the schema](./schema.prisma) after the migration.

## Database Steps

```sql
CREATE TABLE "balance" (
    "participant" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "processedDeposit" TEXT NOT NULL,
    "channelAddress" TEXT NOT NULL,

    FOREIGN KEY ("channelAddress") REFERENCES "channel"("channelAddress") ON DELETE CASCADE ON UPDATE CASCADE,
PRIMARY KEY ("participant","channelAddress","assetId")
)

CREATE TABLE "channel" (
    "channelAddress" TEXT NOT NULL,
    "publicIdentifierA" TEXT NOT NULL,
    "publicIdentifierB" TEXT NOT NULL,
    "participantA" TEXT NOT NULL,
    "participantB" TEXT NOT NULL,
    "assetIds" TEXT NOT NULL,
    "timeout" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL,
    "merkleRoot" TEXT NOT NULL,
    "channelFactoryAddress" TEXT NOT NULL,
    "channelMastercopyAddress" TEXT NOT NULL,
    "transferRegistryAddress" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "providerUrl" TEXT NOT NULL,
PRIMARY KEY ("channelAddress")
)

CREATE TABLE "update" (
    "channelAddress" TEXT,
    "channelAddressId" TEXT NOT NULL,
    "fromIdentifier" TEXT NOT NULL,
    "toIdentifier" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL,
    "amountA" TEXT NOT NULL,
    "amountB" TEXT NOT NULL,
    "toA" TEXT NOT NULL,
    "toB" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "signatureA" TEXT,
    "signatureB" TEXT,
    "totalDepositedA" TEXT,
    "totalDepositedB" TEXT,
    "transferAmountA" TEXT,
    "transferAmountB" TEXT,
    "transferToA" TEXT,
    "transferToB" TEXT,
    "transferId" TEXT,
    "transferDefinition" TEXT,
    "transferTimeout" TEXT,
    "transferInitialState" TEXT,
    "transferEncodings" TEXT,
    "merkleProofData" TEXT,
    "meta" TEXT,
    "responder" TEXT,
    "transferResolver" TEXT,
    "merkleRoot" TEXT,

    FOREIGN KEY ("channelAddress") REFERENCES "channel"("channelAddress") ON DELETE SET NULL ON UPDATE CASCADE,
PRIMARY KEY ("channelAddressId","nonce")
)

CREATE TABLE "transfer" (
    "transferId" TEXT NOT NULL,
    "routingId" TEXT NOT NULL,
    "amountA" TEXT NOT NULL,
    "amountB" TEXT NOT NULL,
    "toA" TEXT NOT NULL,
    "toB" TEXT NOT NULL,
    "initialStateHash" TEXT NOT NULL,
    "channelAddress" TEXT,
    "channelAddressId" TEXT NOT NULL,
    "createUpdateChannelAddressId" TEXT,
    "createUpdateNonce" INTEGER,
    "resolveUpdateChannelAddressId" TEXT,
    "resolveUpdateNonce" INTEGER,

    FOREIGN KEY ("createUpdateChannelAddressId","createUpdateNonce") REFERENCES "update"("channelAddressId","nonce") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("resolveUpdateChannelAddressId","resolveUpdateNonce") REFERENCES "update"("channelAddressId","nonce") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("channelAddress") REFERENCES "channel"("channelAddress") ON DELETE SET NULL ON UPDATE CASCADE,
PRIMARY KEY ("transferId")
)

CREATE TABLE "event-subscription" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "url" TEXT NOT NULL,
PRIMARY KEY ("id")
)

CREATE TABLE "onchain_transaction" (
    "transactionHash" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "nonce" INTEGER NOT NULL,
    "gasLimit" TEXT NOT NULL,
    "gasPrice" TEXT NOT NULL,
    "timestamp" TEXT,
    "raw" TEXT,
    "blockHash" TEXT,
    "blockNumber" INTEGER,
    "contractAddress" TEXT,
    "transactionIndex" INTEGER,
    "root" TEXT,
    "gasUsed" TEXT,
    "logsBloom" TEXT,
    "logs" TEXT,
    "cumulativeGasUsed" TEXT,
    "byzantium" BOOLEAN,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "reason" TEXT NOT NULL,
    "error" TEXT,
    "channelAddress" TEXT NOT NULL,

    FOREIGN KEY ("channelAddress") REFERENCES "channel"("channelAddress") ON DELETE CASCADE ON UPDATE CASCADE,
PRIMARY KEY ("transactionHash")
)

CREATE TABLE "configuration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mnemonic" TEXT NOT NULL
)

CREATE TABLE "node_index" (
    "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "publicIdentifier" TEXT NOT NULL
)

CREATE UNIQUE INDEX "channel.publicIdentifierA_publicIdentifierB_chainId_unique" ON "channel"("publicIdentifierA", "publicIdentifierB", "chainId")

CREATE UNIQUE INDEX "channel.participantA_participantB_chainId_unique" ON "channel"("participantA", "participantB", "chainId")

CREATE UNIQUE INDEX "update_channelAddress_unique" ON "update"("channelAddress")

CREATE UNIQUE INDEX "transfer.routingId_channelAddressId_unique" ON "transfer"("routingId", "channelAddressId")

CREATE UNIQUE INDEX "transfer_createUpdateChannelAddressId_createUpdateNonce_unique" ON "transfer"("createUpdateChannelAddressId", "createUpdateNonce")

CREATE UNIQUE INDEX "transfer_resolveUpdateChannelAddressId_resolveUpdateNonce_unique" ON "transfer"("resolveUpdateChannelAddressId", "resolveUpdateNonce")

CREATE UNIQUE INDEX "event-subscription.event_unique" ON "event-subscription"("event")

CREATE UNIQUE INDEX "onchain_transaction.transactionHash_unique" ON "onchain_transaction"("transactionHash")

CREATE UNIQUE INDEX "onchain_transaction.from_nonce_unique" ON "onchain_transaction"("from", "nonce")

CREATE UNIQUE INDEX "configuration.mnemonic_unique" ON "configuration"("mnemonic")

CREATE UNIQUE INDEX "node_index.publicIdentifier_unique" ON "node_index"("publicIdentifier")
```

## Changes

```diff
diff --git schema.prisma schema.prisma
migration ..20201013125322-init
--- datamodel.dml
+++ datamodel.dml
@@ -1,0 +1,193 @@
+generator client {
+  provider        = "prisma-client-js"
+  previewFeatures = ["connectOrCreate"]
+  binaryTargets   = ["native"]
+}
+
+datasource db {
+  provider = ["postgresql", "sqlite"]
+  url = "***"
+}
+
+model Balance {
+  participant      String
+  assetId          String
+  to               String
+  amount           String
+  processedDeposit String
+  Channel          Channel @relation(fields: [channelAddress], references: [channelAddress])
+  channelAddress   String
+
+  @@id([participant, channelAddress, assetId])
+  @@map(name: "balance")
+}
+
+model Channel {
+  channelAddress           String    @id
+  publicIdentifierA        String
+  publicIdentifierB        String
+  participantA             String
+  participantB             String
+  assetIds                 String
+  timeout                  String
+  nonce                    Int
+  merkleRoot               String
+  balances                 Balance[]
+  channelFactoryAddress    String
+  channelMastercopyAddress String
+  transferRegistryAddress  String
+  chainId                  Int
+  providerUrl              String
+  latestUpdate             Update
+
+  activeTransfers Transfer[]
+
+  OnchainTransaction OnchainTransaction[]
+  @@unique([publicIdentifierA, publicIdentifierB, chainId])
+  @@unique([participantA, participantB, chainId])
+  @@map(name: "channel")
+}
+
+model Update {
+  // COMMON PARAMS
+  channelAddress   String?
+  channel          Channel? @relation(fields: [channelAddress], references: [channelAddress])
+  channelAddressId String // required for ID so that relation can be removed
+
+  fromIdentifier String
+  toIdentifier   String
+  type           String
+  nonce          Int
+
+  // balance
+  amountA String
+  amountB String
+  toA     String
+  toB     String
+
+  assetId    String
+  signatureA String?
+  signatureB String?
+
+  // DETAILS
+  // deposit details
+  totalDepositedA String?
+  totalDepositedB String?
+
+  // create details
+  transferAmountA      String?
+  transferAmountB      String?
+  transferToA          String?
+  transferToB          String?
+  transferId           String?
+  transferDefinition   String?
+  transferTimeout      String?
+  transferInitialState String? // JSON string
+  transferEncodings    String?
+  merkleProofData      String? // proofs.join(",")
+  meta                 String?
+  responder            String?
+
+  // resolve details
+  transferResolver String?
+  merkleRoot       String?
+
+  // setup inferred from channel params
+
+  createdTransfer  Transfer? @relation("CreatedTransfer")
+  resolvedTransfer Transfer? @relation("ResolvedTransfer")
+
+  @@id([channelAddressId, nonce])
+  @@map(name: "update")
+}
+
+model Transfer {
+  transferId String @id
+  routingId  String
+
+  createUpdate  Update? @relation(name: "CreatedTransfer", fields: [createUpdateChannelAddressId, createUpdateNonce], references: [channelAddressId, nonce])
+  resolveUpdate Update? @relation(name: "ResolvedTransfer", fields: [resolveUpdateChannelAddressId, resolveUpdateNonce], references: [channelAddressId, nonce])
+
+  // balance
+  amountA String
+  amountB String
+  toA     String
+  toB     String
+
+  initialStateHash String
+
+  channel          Channel? @relation(fields: [channelAddress], references: [channelAddress])
+  channelAddress   String?
+  channelAddressId String // required for ID so that relation can be removed
+
+  // created will always exist
+  createUpdateChannelAddressId String?
+  createUpdateNonce            Int?
+
+  // resolved will not always exist
+  resolveUpdateChannelAddressId String?
+  resolveUpdateNonce            Int?
+
+  @@unique([routingId, channelAddressId])
+  @@map(name: "transfer")
+}
+
+model EventSubscription {
+  id    String @id @default(uuid())
+  event String @unique
+  url   String
+
+  @@map(name: "event-subscription")
+}
+
+model OnchainTransaction {
+  // Response fields
+  transactionHash String @id
+  to              String
+  from            String
+  data            String
+  value           String
+  chainId         Int
+  nonce           Int
+  gasLimit        String
+  gasPrice        String
+
+  // Receipt fields
+  timestamp         String?
+  raw               String?
+  blockHash         String?
+  blockNumber       Int?
+  contractAddress   String?
+  transactionIndex  Int?
+  root              String?
+  gasUsed           String?
+  logsBloom         String?
+  logs              String?
+  cumulativeGasUsed String?
+  byzantium         Boolean?
+
+  // Channel fields
+  status         String  @default("submitted") // no enums
+  reason         String // no enums
+  error          String?
+  channelAddress String
+  channel        Channel @relation(fields: [channelAddress], references: [channelAddress])
+
+  @@unique(transactionHash)
+  @@unique([from, nonce])
+  @@map(name: "onchain_transaction")
+}
+
+model Configuration {
+  id       Int    @id
+  mnemonic String @unique
+
+  @@map(name: "configuration")
+}
+
+model NodeIndex {
+  index Int @id
+  publicIdentifier String @unique
+
+  @@map(name: "node_index")
+}
```


