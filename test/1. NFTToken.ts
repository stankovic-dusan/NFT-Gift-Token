import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { NFTToken } from "../typechain/NFTToken";
import { IERC20 } from "../typechain/IERC20";

chai.use(solidity);
const { expect } = chai;

const hre = require("hardhat");

describe("NFTGift", () => {
  let signers: any;

  let nfttoken: NFTToken;
  let bencorMainNetwork: string = "0x52Ae12ABe5D8BD778BD5397F99cA900624CfADD4";
  let ethAddress: string = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

  let erc20Interface = JSON.parse(
    require("fs").readFileSync(
      "./artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json"
    )
  )["abi"];

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const nfttokenFactory = await ethers.getContractFactory(
      "NFTToken",
      signers[0]
    );
    nfttoken = (await nfttokenFactory.deploy(bencorMainNetwork)) as NFTToken;
    await nfttoken.deployed();

    expect(await nfttoken.name()).to.be.eq("NFTGift");
    expect(await nfttoken.symbol()).to.be.eq("NTG");
    expect(nfttoken.address).to.properAddress;
  });

  describe("create NFT", async () => {
    it.only("should transfer and create NFT", async () => {
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x0ec9e8aa56e0425b60dee347c8efbad959579d0f"],
      });

      const richUser = await ethers.getSigner(
        "0x0ec9e8aa56e0425b60dee347c8efbad959579d0f"
      );

      await signers[0].sendTransaction({
        to: richUser.address,
        value: ethers.constants.WeiPerEther.mul(10),
      });

      let UNISWAP: IERC20 = new ethers.Contract(
        "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        erc20Interface,
        richUser
      ) as IERC20;

      await UNISWAP.approve(
        nfttoken.address,
        ethers.constants.WeiPerEther.mul(10)
      );

      nfttoken = await nfttoken.connect(richUser);

      await expect(() =>
        nfttoken.createNft(
          UNISWAP.address,
          ethers.constants.WeiPerEther.mul(10)
        )
      ).to.changeTokenBalances(
        UNISWAP,
        [richUser, nfttoken],
        [
          ethers.constants.WeiPerEther.mul(-10),
          ethers.constants.WeiPerEther.mul(10),
        ]
      );

      expect(await nfttoken.exists(0)).to.be.true;
      expect(await nfttoken.balanceOf(richUser.address)).to.be.eq(1);
      expect(await nfttoken.getTokenAmount(0)).to.eq(
        ethers.constants.WeiPerEther.mul(10)
      );
      expect(await nfttoken.getTokenAddress(0)).to.eq(UNISWAP.address);
    });

    it("should transfer ETH and create NFT", async () => {
      await expect(() =>
        nfttoken.createNft(ethAddress, 0, {
          value: ethers.constants.WeiPerEther.mul(10),
        })
      ).to.changeEtherBalances(
        [signers[0], nfttoken],
        [
          ethers.constants.WeiPerEther.mul(-10),
          ethers.constants.WeiPerEther.mul(10),
        ]
      );

      expect(await nfttoken.exists(0)).to.be.true;
      expect(await nfttoken.balanceOf(signers[0].address)).to.be.eq(1);
      expect(await nfttoken.getTokenAmount(0)).to.eq(
        ethers.constants.WeiPerEther.mul(10)
      );
      expect(await nfttoken.getTokenAddress(0)).to.eq(ethAddress);
    });

    it("shoud fail creating NFT with inssuficient balance", async () => {
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x0ec9e8aa56e0425b60dee347c8efbad959579d0f"],
      });

      const richUser = await ethers.getSigner(
        "0x0ec9e8aa56e0425b60dee347c8efbad959579d0f"
      );

      await signers[0].sendTransaction({
        to: richUser.address,
        value: ethers.constants.WeiPerEther.mul(10),
      });

      let UNISWAP: IERC20 = new ethers.Contract(
        "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        erc20Interface,
        richUser
      ) as IERC20;

      await UNISWAP.approve(
        nfttoken.address,
        ethers.constants.WeiPerEther.mul(10)
      );

      nfttoken = await nfttoken.connect(richUser);

      await expect(
        nfttoken.createNft(
          UNISWAP.address,
          ethers.constants.WeiPerEther.mul(40)
        )
      ).to.be.revertedWith(
        "VM Exception while processing transaction: reverted with reason string 'Uni::transferFrom: transfer amount exceeds spender allowance"
      );
    });

    it("shoud fail creating NFT with inssuficient approval", async () => {
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x0ec9e8aa56e0425b60dee347c8efbad959579d0f"],
      });

      const richUser = await ethers.getSigner(
        "0x0ec9e8aa56e0425b60dee347c8efbad959579d0f"
      );

      await signers[0].sendTransaction({
        to: richUser.address,
        value: ethers.constants.WeiPerEther.mul(10),
      });

      let UNISWAP: IERC20 = new ethers.Contract(
        "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        erc20Interface,
        richUser
      ) as IERC20;

      nfttoken = await nfttoken.connect(richUser);

      await expect(
        nfttoken.createNft(
          UNISWAP.address,
          ethers.constants.WeiPerEther.mul(40)
        )
      ).to.be.revertedWith(
        "VM Exception while processing transaction: reverted with reason string 'Uni::transferFrom: transfer amount exceeds spender allowance"
      );
    });
  });

  describe("liquidate NFT", async () => {
    it("should withdraw and burn NFT", async () => {
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x0ec9e8aa56e0425b60dee347c8efbad959579d0f"],
      });

      const richUser = await ethers.getSigner(
        "0x0ec9e8aa56e0425b60dee347c8efbad959579d0f"
      );

      await signers[0].sendTransaction({
        to: richUser.address,
        value: ethers.constants.WeiPerEther.mul(10),
      });

      let UNISWAP: IERC20 = new ethers.Contract(
        "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        erc20Interface,
        richUser
      ) as IERC20;

      let MATIC: IERC20 = new ethers.Contract(
        "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0",
        erc20Interface,
        richUser
      ) as IERC20;

      await UNISWAP.approve(
        nfttoken.address,
        ethers.constants.WeiPerEther.mul(10)
      );

      nfttoken = await nfttoken.connect(richUser);

      await nfttoken.createNft(
        UNISWAP.address,
        ethers.constants.WeiPerEther.mul(10)
      );

      await nfttoken.liquidateNft(0, MATIC.address, 0);

      expect(await nfttoken.exists(0)).to.be.true;
      expect(await nfttoken.balanceOf(richUser.address)).to.be.eq(0);
    });

    it("should fail liquidating non existant NFT", async () => {
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x0ec9e8aa56e0425b60dee347c8efbad959579d0f"],
      });

      const richUser = await ethers.getSigner(
        "0x0ec9e8aa56e0425b60dee347c8efbad959579d0f"
      );

      await signers[0].sendTransaction({
        to: richUser.address,
        value: ethers.constants.WeiPerEther.mul(10),
      });

      let UNISWAP: IERC20 = new ethers.Contract(
        "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        erc20Interface,
        richUser
      ) as IERC20;

      let MATIC: IERC20 = new ethers.Contract(
        "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0",
        erc20Interface,
        richUser
      ) as IERC20;

      await UNISWAP.approve(
        nfttoken.address,
        ethers.constants.WeiPerEther.mul(10)
      );

      nfttoken = await nfttoken.connect(richUser);

      await nfttoken.liquidateNft(5, MATIC.address, 0);

      expect(await nfttoken.exists(0)).to.be.false;
      expect(await nfttoken.balanceOf(richUser.address)).to.be.eq(0);
    });

    it("should fail liquidating NFT on to high expectedReturns", async () => {
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x0ec9e8aa56e0425b60dee347c8efbad959579d0f"],
      });

      const richUser = await ethers.getSigner(
        "0x0ec9e8aa56e0425b60dee347c8efbad959579d0f"
      );

      await signers[0].sendTransaction({
        to: richUser.address,
        value: ethers.constants.WeiPerEther.mul(10),
      });

      let UNISWAP: IERC20 = new ethers.Contract(
        "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        erc20Interface,
        richUser
      ) as IERC20;

      let MATIC: IERC20 = new ethers.Contract(
        "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0",
        erc20Interface,
        richUser
      ) as IERC20;

      await UNISWAP.approve(
        nfttoken.address,
        ethers.constants.WeiPerEther.mul(10)
      );

      nfttoken = await nfttoken.connect(richUser);

      await nfttoken.createNft(
        UNISWAP.address,
        ethers.constants.WeiPerEther.mul(10)
      );

      await nfttoken.liquidateNft(0, MATIC.address, 1);
    });
  });
});
