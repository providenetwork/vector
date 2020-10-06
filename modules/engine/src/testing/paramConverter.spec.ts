import {
  ChainAddresses,
  CreateTransferParams,
  DEFAULT_TRANSFER_TIMEOUT,
  EngineParams,
  FullChannelState,
  FullTransferState,
  ResolveTransferParams,
  Result,
} from "@connext/vector-types";
import {
  createTestChannelState,
  createTestChannelStateWithSigners,
  createTestFullHashlockTransferState,
  getRandomBytes32,
  getRandomChannelSigner,
  getRandomIdentifier,
  mkAddress,
} from "@connext/vector-utils";
import { expect } from "chai";
import Sinon from "sinon";
import { VectorChainReader, WithdrawCommitment } from "@connext/vector-contracts";
import { BigNumber } from "ethers";

import { InvalidTransferType } from "../errors";
import {
  convertConditionalTransferParams,
  convertResolveConditionParams,
  convertWithdrawParams,
} from "../paramConverter";

import { env } from "./env";

describe("ParamConverter", () => {
  const chainId = parseInt(Object.keys(env.chainProviders)[0]);
  const providerUrl = env.chainProviders[chainId];
  const signerA = getRandomChannelSigner(providerUrl);
  const signerB = getRandomChannelSigner(providerUrl);
  const chainAddresses: ChainAddresses = {
    [chainId]: {
      withdrawAddress: env.chainAddresses[chainId].withdrawAddress,
      channelFactoryAddress: env.chainAddresses[chainId].channelFactoryAddress,
      hashlockTransferAddress: env.chainAddresses[chainId].hashlockTransferAddress,
      channelMastercopyAddress: env.chainAddresses[chainId].channelMastercopyAddress,
    },
  };
  let chainReader: Sinon.SinonStubbedInstance<VectorChainReader>;

  beforeEach(() => {
    chainReader = Sinon.createStubInstance(VectorChainReader);

    chainReader.getBlockNumber.resolves(Result.ok<number>(110));
  });

  afterEach(() => Sinon.restore());

  describe("convertConditionalTransferParams", () => {
    const generateParams = (bIsRecipient = false): EngineParams.ConditionalTransfer => {
      return {
        channelAddress: mkAddress("0xa"),
        amount: "8",
        assetId: mkAddress("0x0"),
        recipient: bIsRecipient ? signerB.publicIdentifier : getRandomIdentifier(),
        recipientChainId: 1,
        recipientAssetId: mkAddress("0x1"),
        transferDefinition: env.chainAddresses[chainId].hashlockTransferAddress,
        transferInitialState: {
          lockHash: getRandomBytes32(),
        },
        meta: {
          message: "test",
          routingId: getRandomBytes32(),
        },
      };
    };

    it("should work for A", async () => {
      console.log(`Block number: ${await chainReader.getBlockNumber(chainId)}`);
      const params = generateParams();
      const channelState: FullChannelState = createTestChannelStateWithSigners([signerA, signerB], "setup", {
        channelAddress: params.channelAddress,
        networkContext: {
          ...chainAddresses[chainId],
          chainId,
          providerUrl,
        },
      });
      const ret: CreateTransferParams = (
        await convertConditionalTransferParams(params, signerA, channelState)
      ).getValue();
      expect(ret).to.deep.eq({
        channelAddress: channelState.channelAddress,
        amount: params.amount,
        assetId: params.assetId,
        transferDefinition: chainAddresses[chainId].hashlockTransferAddress,
        transferInitialState: {
          balance: {
            amount: [params.amount, "0"],
            to: [signerA.address, signerB.address],
          },
          lockHash: params.transferInitialState.lockHash,
          expiry: "0",
        },
        timeout: DEFAULT_TRANSFER_TIMEOUT.toString(),
        meta: {
          requireOnline: false,
          routingId: params.meta.routingId,
          path: [
            {
              recipientAssetId: params.recipientAssetId,
              recipientChainId: params.recipientChainId,
              recipient: params.recipient,
            },
          ],
          ...params.meta,
        },
      });
    });

    it("should work for B", async () => {
      const params = generateParams();
      params.transferInitialState.timelock = "100";
      const channelState: FullChannelState = createTestChannelStateWithSigners([signerA, signerB], "setup", {
        channelAddress: params.channelAddress,
        networkContext: {
          ...chainAddresses[chainId],
          chainId,
          providerUrl,
        },
      });
      const ret: CreateTransferParams = (
        await convertConditionalTransferParams(params, signerB, channelState)
      ).getValue();
      expect(ret).to.deep.eq({
        channelAddress: channelState.channelAddress,
        amount: params.amount,
        assetId: params.assetId,
        transferDefinition: chainAddresses[chainId].hashlockTransferAddress,
        transferInitialState: {
          balance: {
            amount: [params.amount, "0"],
            to: [signerB.address, signerA.address],
          },
          lockHash: params.transferInitialState.lockHash,
          expiry: BigNumber.from((await chainReader.getBlockNumber(chainId)).getValue()!)
            .add(params.transferInitialState.timelock)
            .toString(),
        },
        timeout: DEFAULT_TRANSFER_TIMEOUT.toString(),
        meta: {
          requireOnline: false,
          routingId: params.meta.routingId,
          path: [
            {
              recipientAssetId: params.recipientAssetId,
              recipientChainId: params.recipientChainId,
              recipient: params.recipient,
            },
          ],
          ...params.meta,
        },
      });
    });

    it("should fail if invalid type", async () => {
      const params: any = generateParams();
      // Set incorrect type
      params.conditionType = "FailingTest";
      const channelState: FullChannelState = createTestChannelState("setup", {
        channelAddress: params.channelAddress,
        networkContext: {
          ...chainAddresses[chainId],
          chainId,
          providerUrl,
        },
      });
      const ret = await convertConditionalTransferParams(params, signerA, channelState);
      expect(ret.isError).to.be.true;
      expect(ret.getError()).to.contain(new InvalidTransferType(params.conditionType));
    });
  });

  describe("convertResolveConditionParams", () => {
    const generateParams = (): EngineParams.ResolveTransfer => {
      return {
        channelAddress: mkAddress("0xa"),
        transferId: getRandomBytes32(),
        transferResolver: {
          preImage: getRandomBytes32(),
        },
        meta: {
          message: "test",
        },
      };
    };

    it("should work", async () => {
      const params = generateParams();
      const transferState: FullTransferState = createTestFullHashlockTransferState({
        channelAddress: params.channelAddress,
      });
      const ret: ResolveTransferParams = convertResolveConditionParams(params, transferState).getValue();
      expect(ret).to.deep.eq({
        channelAddress: params.channelAddress,
        transferId: transferState.transferId,
        transferResolver: {
          preImage: params.transferResolver.preImage,
        },
        meta: {
          details: params.meta,
        },
      });
    });

    it("should fail if invalid type", async () => {
      const params: any = generateParams();
      // Set incorrect type
      params.conditionType = "FailingTest";
      const transferState: FullTransferState = createTestFullHashlockTransferState({
        channelAddress: params.channelAddress,
      });
      const ret = convertResolveConditionParams(params, transferState);
      expect(ret.isError).to.be.true;
      expect(ret.getError()).to.contain(new InvalidTransferType(params.conditionType));
    });
  });

  describe("convertWithdrawParams", () => {
    const generateParams = () => {
      return {
        channelAddress: mkAddress("0xa"),
        amount: "8",
        assetId: mkAddress("0x0"),
        recipient: mkAddress("0xb"),
        fee: "1",
      };
    };

    const generateChainData = (params, channel) => {
      const commitment = new WithdrawCommitment(
        channel.channelAddress,
        channel.alice,
        channel.bob,
        params.recipient,
        params.assetId,
        params.amount,
        channel.nonce.toString(),
      );
      return commitment.hashToSign();
    };

    it("should work for A", async () => {
      const params = generateParams();
      const channelState: FullChannelState = createTestChannelStateWithSigners([signerA, signerB], "setup", {
        channelAddress: params.channelAddress,
        networkContext: {
          ...chainAddresses[chainId],
          chainId,
          providerUrl,
        },
      });
      const withdrawHash = generateChainData(params, channelState);
      const signature = await signerA.signMessage(withdrawHash);

      const ret: CreateTransferParams = (
        await convertWithdrawParams(params, signerA, channelState, chainAddresses)
      ).getValue();
      expect(ret).to.deep.eq({
        channelAddress: channelState.channelAddress,
        amount: BigNumber.from(params.amount)
          .add(params.fee)
          .toString(),
        assetId: params.assetId,
        transferDefinition: chainAddresses[chainId].withdrawAddress,
        transferInitialState: {
          balance: {
            amount: [
              BigNumber.from(params.amount)
                .add(params.fee)
                .toString(),
              "0",
            ],
            to: [params.recipient, channelState.bob],
          },
          initiatorSignature: signature,
          initiator: signerA.address,
          responder: signerB.address,
          data: withdrawHash,
          nonce: channelState.nonce.toString(),
          fee: params.fee ? params.fee : "0",
        },
        timeout: DEFAULT_TRANSFER_TIMEOUT.toString(),
        meta: {
          withdrawNonce: channelState.nonce.toString(),
        },
      });
    });

    it("should work for B", async () => {
      const params = generateParams();
      const channelState: FullChannelState = createTestChannelStateWithSigners([signerA, signerB], "setup", {
        channelAddress: params.channelAddress,
        networkContext: {
          ...chainAddresses[chainId],
          chainId,
          providerUrl,
        },
      });
      const withdrawHash = generateChainData(params, channelState);
      const signature = await signerB.signMessage(withdrawHash);

      const ret: CreateTransferParams = (
        await convertWithdrawParams(params, signerB, channelState, chainAddresses)
      ).getValue();
      expect(ret).to.deep.eq({
        channelAddress: channelState.channelAddress,
        amount: BigNumber.from(params.amount)
          .add(params.fee)
          .toString(),
        assetId: params.assetId,
        transferDefinition: chainAddresses[chainId].withdrawAddress,
        transferInitialState: {
          balance: {
            amount: [
              BigNumber.from(params.amount)
                .add(params.fee)
                .toString(),
              "0",
            ],
            to: [params.recipient, channelState.alice],
          },
          initiatorSignature: signature,
          responder: signerA.address,
          initiator: signerB.address,
          data: withdrawHash,
          nonce: channelState.nonce.toString(),
          fee: params.fee ? params.fee : "0",
        },
        timeout: DEFAULT_TRANSFER_TIMEOUT.toString(),
        meta: {
          withdrawNonce: channelState.nonce.toString(),
        },
      });
    });
  });
});
