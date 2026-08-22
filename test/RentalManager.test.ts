import { expect } from "chai";
import hre from "hardhat";

const { ethers, networkHelpers } = await hre.network.create();

describe("RentalManager", function () {
  const rent = ethers.parseEther("1"); // 1 ETH/ky
  const deposit = ethers.parseEther("2"); // coc 2 ETH

  async function deployRentalSystemFixture() {
    const [landlord, tenant, other] = await ethers.getSigners();

    const TokenFactory = await ethers.getContractFactory(
      "RentalAgreementToken",
    );
    const token = await TokenFactory.connect(landlord).deploy(
      landlord.address,
    );
    await token.waitForDeployment();

    const ManagerFactory = await ethers.getContractFactory("RentalManager");
    const contract = await ManagerFactory.connect(landlord).deploy(
      await token.getAddress(),
    );
    await contract.waitForDeployment();

    // Cap quyen mint cho RentalManager (tuong tu ignition module luc deploy that)
    const minterRole = await token.MINTER_ROLE();
    await token
      .connect(landlord)
      .grantRole(minterRole, await contract.getAddress());

    // Chu nha dang mot tai san
    await contract
      .connect(landlord)
      .listProperty("Phong Quan 1", "TP.HCM", rent, deposit, "", "");

    return { contract, token, landlord, tenant, other };
  }

  it("Chu nha dang tai san thanh cong", async function () {
    const { contract, landlord } = await networkHelpers.loadFixture(
      deployRentalSystemFixture,
    );

    const p = await contract.getProperty(1);
    expect(p.landlord).to.equal(landlord.address);
    expect(p.monthlyRent).to.equal(rent);
    expect(p.deposit).to.equal(deposit);
    expect(p.status).to.equal(0n); // Listed
  });

  it("Nguoi thue dat coc dung so tien -> hop dong kich hoat", async function () {
    const { contract, tenant } = await networkHelpers.loadFixture(
      deployRentalSystemFixture,
    );

    await contract.connect(tenant).rentProperty(1, { value: deposit });
    const p = await contract.getProperty(1);
    expect(p.tenant).to.equal(tenant.address);
    expect(p.depositHeld).to.equal(deposit);
    expect(p.status).to.equal(1n); // Active
  });

  it("Chan dat coc sai so tien", async function () {
    const { contract, tenant } = await networkHelpers.loadFixture(
      deployRentalSystemFixture,
    );

    await expect(
      contract
        .connect(tenant)
        .rentProperty(1, { value: ethers.parseEther("1") }),
    ).to.be.revertedWith("Phai dat coc dung so tien");
  });

  it("Chan chu nha tu thue nha cua minh", async function () {
    const { contract, landlord } = await networkHelpers.loadFixture(
      deployRentalSystemFixture,
    );

    await expect(
      contract.connect(landlord).rentProperty(1, { value: deposit }),
    ).to.be.revertedWith("Chu nha khong the tu thue");
  });

  it("Tien coc do contract giu, khong vao vi chu nha", async function () {
    const { contract, tenant } = await networkHelpers.loadFixture(
      deployRentalSystemFixture,
    );

    await contract.connect(tenant).rentProperty(1, { value: deposit });
    const balance = await ethers.provider.getBalance(
      await contract.getAddress(),
    );
    expect(balance).to.equal(deposit);
  });

  it("Nguoi thue tra tien -> chuyen thang cho chu nha", async function () {
    const { contract, landlord, tenant } = await networkHelpers.loadFixture(
      deployRentalSystemFixture,
    );

    await contract.connect(tenant).rentProperty(1, { value: deposit });
    await expect(
      contract.connect(tenant).payRent(1, { value: rent }),
    ).to.changeEtherBalance(ethers, landlord, rent);
  });

  it("Chan nguoi la tra tien thue", async function () {
    const { contract, tenant, other } = await networkHelpers.loadFixture(
      deployRentalSystemFixture,
    );

    await contract.connect(tenant).rentProperty(1, { value: deposit });
    await expect(
      contract.connect(other).payRent(1, { value: rent }),
    ).to.be.revertedWith("Chi nguoi thue moi tra tien");
  });

  it("Ket thuc hop dong: hoan coc dung sau khi khau tru", async function () {
    const { contract, landlord, tenant } = await networkHelpers.loadFixture(
      deployRentalSystemFixture,
    );

    await contract.connect(tenant).rentProperty(1, { value: deposit });
    await contract.connect(tenant).confirmHandover(1);
    const deduct = ethers.parseEther("0.5");
    // Nguoi thue nhan lai 1.5 ETH (2 - 0.5)
    await expect(
      contract.connect(landlord).endLease(1, deduct),
    ).to.changeEtherBalance(ethers, tenant, deposit - deduct);
    const p = await contract.getProperty(1);
    expect(p.status).to.equal(3n); // Ended
    expect(p.depositHeld).to.equal(0n);
  });

  it("Chan ket thuc khi chua ban giao", async function () {
    const { contract, landlord, tenant } = await networkHelpers.loadFixture(
      deployRentalSystemFixture,
    );

    await contract.connect(tenant).rentProperty(1, { value: deposit });
    await expect(
      contract.connect(landlord).endLease(1, 0n),
    ).to.be.revertedWith("Chua ban giao phong");
  });

  it("Chan khau tru vuot qua tien coc", async function () {
    const { contract, landlord, tenant } = await networkHelpers.loadFixture(
      deployRentalSystemFixture,
    );

    await contract.connect(tenant).rentProperty(1, { value: deposit });
    await contract.connect(tenant).confirmHandover(1);
    await expect(
      contract.connect(landlord).endLease(1, ethers.parseEther("3")),
    ).to.be.revertedWith("Khau tru vuot qua tien coc");
  });

  it("Luu va tra ve dung CID anh IPFS khi dang tai san", async function () {
    const { contract, landlord } = await networkHelpers.loadFixture(
      deployRentalSystemFixture,
    );
    const cid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

    await contract
      .connect(landlord)
      .listProperty("Phong co anh", "TP.HCM", rent, deposit, cid, "");

    const p = await contract.getProperty(2);
    expect(p.imageCID).to.equal(cid);

    // Tai san dang o property #1 (tao trong fixture) khong dinh kem anh -> rong.
    const p1 = await contract.getProperty(1);
    expect(p1.imageCID).to.equal("");
  });

  it("Luu va tra ve dung ghi chu cua chu nha khi dang tai san", async function () {
    const { contract, landlord } = await networkHelpers.loadFixture(
      deployRentalSystemFixture,
    );
    const note = "Khong nuoi thu cung, gio giac tu do";

    await contract
      .connect(landlord)
      .listProperty("Phong co ghi chu", "TP.HCM", rent, deposit, "", note);

    const p = await contract.getProperty(2);
    expect(p.note).to.equal(note);

    // Tai san #1 (tao trong fixture) khong co ghi chu -> rong.
    const p1 = await contract.getProperty(1);
    expect(p1.note).to.equal("");
  });

  it("Chi chu nha moi duoc ket thuc hop dong", async function () {
    const { contract, tenant, other } = await networkHelpers.loadFixture(
      deployRentalSystemFixture,
    );

    await contract.connect(tenant).rentProperty(1, { value: deposit });
    await contract.connect(tenant).confirmHandover(1);
    await expect(
      contract.connect(other).endLease(1, 0n),
    ).to.be.revertedWith("Chi chu nha moi ket thuc");
  });

  describe("RentalAgreementToken (token dai dien hop dong thue)", function () {
    it("Mint token cho nguoi thue khi dat coc thanh cong", async function () {
      const { contract, token, tenant } = await networkHelpers.loadFixture(
        deployRentalSystemFixture,
      );

      await contract.connect(tenant).rentProperty(1, { value: deposit });
      expect(await token.ownerOf(1n)).to.equal(tenant.address);
      expect(await token.balanceOf(tenant.address)).to.equal(1n);
    });

    it("Khong the chuyen nhuong token hop dong thue", async function () {
      const { contract, token, tenant, other } = await networkHelpers.loadFixture(
        deployRentalSystemFixture,
      );

      await contract.connect(tenant).rentProperty(1, { value: deposit });

      await expect(
        token
          .connect(tenant)
          .transferFrom(tenant.address, other.address, 1n),
      ).to.be.revertedWithCustomError(token, "TransferNotAllowed");

      expect(await token.ownerOf(1n)).to.equal(tenant.address);
    });

    it("Nguoi khong co MINTER_ROLE khong tu mint duoc token", async function () {
      const { token, tenant } = await networkHelpers.loadFixture(
        deployRentalSystemFixture,
      );

      await expect(
        token.connect(tenant).mintAgreement(tenant.address, 999n),
      ).to.be.revertedWithCustomError(
        token,
        "AccessControlUnauthorizedAccount",
      );
    });

    it("Token van ton tai (khong bi xoa) sau khi ket thuc hop dong", async function () {
      const { contract, token, landlord, tenant } = await networkHelpers.loadFixture(
        deployRentalSystemFixture,
      );

      await contract.connect(tenant).rentProperty(1, { value: deposit });
      await contract.connect(tenant).confirmHandover(1);
      await contract.connect(landlord).endLease(1, 0n);

      // Hop dong da Ended nhung token van thuoc ve nguoi thue, khong bi burn.
      expect(await token.ownerOf(1n)).to.equal(tenant.address);
    });

    it("Chan ca hai overload cua safeTransferFrom, khong chi transferFrom", async function () {
      const { contract, token, tenant, other } = await networkHelpers.loadFixture(
        deployRentalSystemFixture,
      );

      await contract.connect(tenant).rentProperty(1, { value: deposit });

      await expect(
        token
          .connect(tenant)
          ["safeTransferFrom(address,address,uint256)"](
            tenant.address,
            other.address,
            1n,
          ),
      ).to.be.revertedWithCustomError(token, "TransferNotAllowed");

      await expect(
        token
          .connect(tenant)
          ["safeTransferFrom(address,address,uint256,bytes)"](
            tenant.address,
            other.address,
            1n,
            "0x",
          ),
      ).to.be.revertedWithCustomError(token, "TransferNotAllowed");

      expect(await token.ownerOf(1n)).to.equal(tenant.address);
    });
  });

  describe("Bao mat: chong reentrancy khi mint token trong rentProperty", function () {
    it("Nguoi thue la contract doc hai khong the goi lai rentProperty trong onERC721Received", async function () {
      const { contract, landlord } = await networkHelpers.loadFixture(
        deployRentalSystemFixture,
      );

      // Dang them mot tai san thu hai de lam muc tieu tan cong tai lai.
      await contract
        .connect(landlord)
        .listProperty("Phong Quan 2", "TP.HCM", rent, deposit, "", "");

      const AttackerFactory = await ethers.getContractFactory(
        "MaliciousReceiver",
      );
      const attacker = await AttackerFactory.deploy(await contract.getAddress());
      await attacker.waitForDeployment();

      // Goi rentProperty(1) -> mint token cho attacker -> onERC721Received cua attacker
      // tu dong thu goi lai rentProperty(2) kem dung tien coc. Neu nonReentrant hoat
      // dong dung, toan bo giao dich phai revert (khong duoc de lot 1 phan).
      await expect(
        attacker.attackRentProperty(1n, 2n, deposit, {
          value: deposit * 2n,
        }),
      ).to.be.revertedWithCustomError(contract, "ReentrancyGuardReentrantCall");

      // Vi ca giao dich revert, ca 2 tai san van phai o trang thai Listed ban dau.
      const p1 = await contract.getProperty(1);
      const p2 = await contract.getProperty(2);
      expect(p1.status).to.equal(0n); // Listed
      expect(p2.status).to.equal(0n); // Listed
    });
  });
});
