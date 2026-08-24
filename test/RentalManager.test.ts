import { expect } from "chai";
import hre from "hardhat";

const { ethers, networkHelpers } = await hre.network.create();

describe("RentalManager", function () {
  const rent = ethers.parseEther("1"); // 1 ETH/ky
  const deposit = ethers.parseEther("2"); // coc 2 ETH
  const RENT_PERIOD = 1000n; // giay - ngan de test time-travel nhanh
  const LATE_FEE_BPS = 500n; // 5%
  const ARBITER_APPROVALS_REQUIRED = 2n;

  async function deployRentalSystemFixture() {
    const [landlord, tenant, other, arbiter2] = await ethers.getSigners();

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
      landlord.address,
      RENT_PERIOD,
      LATE_FEE_BPS,
      ARBITER_APPROVALS_REQUIRED,
    );
    await contract.waitForDeployment();

    // Cap quyen mint cho RentalManager (tuong tu ignition module luc deploy that)
    const minterRole = await token.MINTER_ROLE();
    await token
      .connect(landlord)
      .grantRole(minterRole, await contract.getAddress());

    // landlord la trong tai #1 (admin, tu constructor); cap them arbiter2 lam trong tai #2
    // de test co che multisig (can du 2 trong tai dong thuan).
    const arbiterRole = await contract.ARBITER_ROLE();
    await contract.connect(landlord).grantRole(arbiterRole, arbiter2.address);

    // Chu nha dang mot tai san
    await contract
      .connect(landlord)
      .listProperty("Phong Quan 1", "TP.HCM", rent, deposit, "", "");

    return { contract, token, landlord, tenant, other, arbiter2 };
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
    expect(p.nextDueDate).to.equal(p.startedAt + RENT_PERIOD);
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

  it("Nguoi thue tra tien dung han -> chuyen thang cho chu nha, khong bi phat", async function () {
    const { contract, landlord, tenant } = await networkHelpers.loadFixture(
      deployRentalSystemFixture,
    );

    await contract.connect(tenant).rentProperty(1, { value: deposit });
    await expect(
      contract.connect(tenant).payRent(1, { value: rent }),
    ).to.changeEtherBalance(ethers, landlord, rent);

    const p = await contract.getProperty(1);
    expect(p.rentPaidCount).to.equal(1n);
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

  describe("Phat thanh toan tre", function () {
    it("Tra tien qua han bi bat buoc cong them 5% phat", async function () {
      const { contract, tenant } = await networkHelpers.loadFixture(
        deployRentalSystemFixture,
      );

      await contract.connect(tenant).rentProperty(1, { value: deposit });
      await networkHelpers.time.increase(Number(RENT_PERIOD) + 1);

      // Tra dung tien thue (khong kem phat) phai bi tu choi.
      await expect(
        contract.connect(tenant).payRent(1, { value: rent }),
      ).to.be.revertedWith("Phai tra dung tien thue (cong phat tre neu qua han)");

      const penalty = (rent * LATE_FEE_BPS) / 10000n;
      await expect(
        contract.connect(tenant).payRent(1, { value: rent + penalty }),
      ).to.changeEtherBalance(ethers, tenant, -(rent + penalty));
    });

    it("Han tra tien ky tiep theo tinh tu han cu, khong tinh tu luc tra tre", async function () {
      const { contract, tenant } = await networkHelpers.loadFixture(
        deployRentalSystemFixture,
      );

      await contract.connect(tenant).rentProperty(1, { value: deposit });
      const before = await contract.getProperty(1);

      await networkHelpers.time.increase(Number(RENT_PERIOD) + 50);
      const penalty = (rent * LATE_FEE_BPS) / 10000n;
      await contract.connect(tenant).payRent(1, { value: rent + penalty });

      const after = await contract.getProperty(1);
      expect(after.nextDueDate).to.equal(before.nextDueDate + RENT_PERIOD);
    });
  });

  describe("Tat toan hop dong: de xuat / dong y / khieu nai / trong tai (multisig)", function () {
    async function handedOverFixture() {
      const base = await deployRentalSystemFixture();
      await base.contract.connect(base.tenant).rentProperty(1, { value: deposit });
      await base.contract.connect(base.tenant).confirmHandover(1);
      return base;
    }

    it("Chi chu nha moi de xuat tat toan", async function () {
      const { contract, other } = await networkHelpers.loadFixture(handedOverFixture);

      await expect(
        contract.connect(other).proposeSettlement(1, 0n),
      ).to.be.revertedWith("Chi chu nha moi de xuat");
    });

    it("Chan de xuat truoc khi ban giao", async function () {
      const { contract, landlord, tenant } = await networkHelpers.loadFixture(
        deployRentalSystemFixture,
      );

      await contract.connect(tenant).rentProperty(1, { value: deposit });
      await expect(
        contract.connect(landlord).proposeSettlement(1, 0n),
      ).to.be.revertedWith("Chua ban giao phong");
    });

    it("Chan de xuat khau tru vuot qua tien coc", async function () {
      const { contract, landlord } = await networkHelpers.loadFixture(handedOverFixture);

      await expect(
        contract.connect(landlord).proposeSettlement(1, ethers.parseEther("3")),
      ).to.be.revertedWith("Khau tru vuot qua tien coc");
    });

    it("Nguoi thue dong y de xuat -> tat toan ngay theo dung muc do", async function () {
      const { contract, landlord, tenant } = await networkHelpers.loadFixture(handedOverFixture);
      const deduct = ethers.parseEther("0.5");

      await contract.connect(landlord).proposeSettlement(1, deduct);
      await expect(
        contract.connect(tenant).acceptSettlement(1),
      ).to.changeEtherBalance(ethers, tenant, deposit - deduct);

      const p = await contract.getProperty(1);
      expect(p.status).to.equal(3n); // Ended
      expect(p.depositHeld).to.equal(0n);
    });

    it("Chi nguoi thue moi duoc dong y de xuat", async function () {
      const { contract, landlord, other } = await networkHelpers.loadFixture(handedOverFixture);

      await contract.connect(landlord).proposeSettlement(1, 0n);
      await expect(
        contract.connect(other).acceptSettlement(1),
      ).to.be.revertedWith("Chi nguoi thue moi dong y");
    });

    it("Nguoi thue khieu nai -> chuyen sang trang thai tranh chap", async function () {
      const { contract, landlord, tenant } = await networkHelpers.loadFixture(handedOverFixture);

      await contract.connect(landlord).proposeSettlement(1, ethers.parseEther("1"));
      await contract.connect(tenant).disputeSettlement(1);

      const p = await contract.getProperty(1);
      expect(p.status).to.equal(4n); // Disputed
    });

    it("Nguoi khong phai trong tai khong bo phieu duoc", async function () {
      const { contract, landlord, tenant, other } = await networkHelpers.loadFixture(handedOverFixture);

      await contract.connect(landlord).proposeSettlement(1, ethers.parseEther("1"));
      await contract.connect(tenant).disputeSettlement(1);

      await expect(
        contract.connect(other).voteOnDispute(1, ethers.parseEther("0.5")),
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });

    it("Chi 1 trong tai bo phieu thi chua du nguong, chua tat toan", async function () {
      const { contract, landlord, tenant } = await networkHelpers.loadFixture(handedOverFixture);

      await contract.connect(landlord).proposeSettlement(1, ethers.parseEther("1"));
      await contract.connect(tenant).disputeSettlement(1);

      await contract.connect(landlord).voteOnDispute(1, ethers.parseEther("0.5"));

      const p = await contract.getProperty(1);
      expect(p.status).to.equal(4n); // Van dang Disputed
    });

    it("Du 2 trong tai dong thuan cung 1 muc -> tu dong tat toan (multisig)", async function () {
      const { contract, landlord, tenant, arbiter2 } = await networkHelpers.loadFixture(
        handedOverFixture,
      );
      const agreed = ethers.parseEther("0.5");

      await contract.connect(landlord).proposeSettlement(1, ethers.parseEther("1"));
      await contract.connect(tenant).disputeSettlement(1);

      await contract.connect(landlord).voteOnDispute(1, agreed);
      await expect(
        contract.connect(arbiter2).voteOnDispute(1, agreed),
      ).to.changeEtherBalance(ethers, tenant, deposit - agreed);

      const p = await contract.getProperty(1);
      expect(p.status).to.equal(3n); // Ended
      expect(p.depositHeld).to.equal(0n);
    });

    it("2 trong tai vote khac muc thi khong tu tat toan", async function () {
      const { contract, landlord, tenant, arbiter2 } = await networkHelpers.loadFixture(
        handedOverFixture,
      );

      await contract.connect(landlord).proposeSettlement(1, ethers.parseEther("1"));
      await contract.connect(tenant).disputeSettlement(1);

      await contract.connect(landlord).voteOnDispute(1, ethers.parseEther("0.5"));
      await contract.connect(arbiter2).voteOnDispute(1, ethers.parseEther("0.8"));

      const p = await contract.getProperty(1);
      expect(p.status).to.equal(4n); // Van dang Disputed, chua dong thuan
    });

    it("Trong tai khong duoc bo phieu 2 lan cho cung 1 tranh chap", async function () {
      const { contract, landlord, tenant } = await networkHelpers.loadFixture(handedOverFixture);

      await contract.connect(landlord).proposeSettlement(1, ethers.parseEther("1"));
      await contract.connect(tenant).disputeSettlement(1);

      await contract.connect(landlord).voteOnDispute(1, ethers.parseEther("0.5"));
      await expect(
        contract.connect(landlord).voteOnDispute(1, ethers.parseEther("0.5")),
      ).to.be.revertedWith("Trong tai nay da bo phieu roi");
    });
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
      await contract.connect(landlord).proposeSettlement(1, 0n);
      await contract.connect(tenant).acceptSettlement(1);

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
