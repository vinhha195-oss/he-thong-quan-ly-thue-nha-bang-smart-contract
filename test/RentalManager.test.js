const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RentalManager", function () {
  let contract, landlord, tenant, other;
  const rent = ethers.parseEther("1");     // 1 ETH/ky
  const deposit = ethers.parseEther("2");  // coc 2 ETH

  beforeEach(async function () {
    [landlord, tenant, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("RentalManager");
    contract = await Factory.connect(landlord).deploy();
    await contract.waitForDeployment();
    // Chu nha dang mot tai san
    await contract.connect(landlord).listProperty("Phong Quan 1", "TP.HCM", rent, deposit);
  });

  it("Chu nha dang tai san thanh cong", async function () {
    const p = await contract.getProperty(1);
    expect(p.landlord).to.equal(landlord.address);
    expect(p.monthlyRent).to.equal(rent);
    expect(p.deposit).to.equal(deposit);
    expect(p.status).to.equal(0); // Listed
  });

  it("Nguoi thue dat coc dung so tien -> hop dong kich hoat", async function () {
    await contract.connect(tenant).rentProperty(1, { value: deposit });
    const p = await contract.getProperty(1);
    expect(p.tenant).to.equal(tenant.address);
    expect(p.depositHeld).to.equal(deposit);
    expect(p.status).to.equal(1); // Active
  });

  it("Chan dat coc sai so tien", async function () {
    await expect(
      contract.connect(tenant).rentProperty(1, { value: ethers.parseEther("1") })
    ).to.be.revertedWith("Phai dat coc dung so tien");
  });

  it("Chan chu nha tu thue nha cua minh", async function () {
    await expect(
      contract.connect(landlord).rentProperty(1, { value: deposit })
    ).to.be.revertedWith("Chu nha khong the tu thue");
  });

  it("Tien coc do contract giu, khong vao vi chu nha", async function () {
    await contract.connect(tenant).rentProperty(1, { value: deposit });
    const balance = await ethers.provider.getBalance(await contract.getAddress());
    expect(balance).to.equal(deposit);
  });

  it("Nguoi thue tra tien -> chuyen thang cho chu nha", async function () {
    await contract.connect(tenant).rentProperty(1, { value: deposit });
    await expect(
      contract.connect(tenant).payRent(1, { value: rent })
    ).to.changeEtherBalance(landlord, rent);
  });

  it("Chan nguoi la tra tien thue", async function () {
    await contract.connect(tenant).rentProperty(1, { value: deposit });
    await expect(
      contract.connect(other).payRent(1, { value: rent })
    ).to.be.revertedWith("Chi nguoi thue moi tra tien");
  });

  it("Ket thuc hop dong: hoan coc dung sau khi khau tru", async function () {
    await contract.connect(tenant).rentProperty(1, { value: deposit });
    await contract.connect(tenant).confirmHandover(1);
    const deduct = ethers.parseEther("0.5");
    // Nguoi thue nhan lai 1.5 ETH (2 - 0.5)
    await expect(
      contract.connect(landlord).endLease(1, deduct)
    ).to.changeEtherBalance(tenant, deposit - deduct);
    const p = await contract.getProperty(1);
    expect(p.status).to.equal(3); // Ended
    expect(p.depositHeld).to.equal(0);
  });

  it("Chan ket thuc khi chua ban giao", async function () {
    await contract.connect(tenant).rentProperty(1, { value: deposit });
    await expect(
      contract.connect(landlord).endLease(1, 0)
    ).to.be.revertedWith("Chua ban giao phong");
  });

  it("Chan khau tru vuot qua tien coc", async function () {
    await contract.connect(tenant).rentProperty(1, { value: deposit });
    await contract.connect(tenant).confirmHandover(1);
    await expect(
      contract.connect(landlord).endLease(1, ethers.parseEther("3"))
    ).to.be.revertedWith("Khau tru vuot qua tien coc");
  });

  it("Chi chu nha moi duoc ket thuc hop dong", async function () {
    await contract.connect(tenant).rentProperty(1, { value: deposit });
    await contract.connect(tenant).confirmHandover(1);
    await expect(
      contract.connect(other).endLease(1, 0)
    ).to.be.revertedWith("Chi chu nha moi ket thuc");
  });
});
