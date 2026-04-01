// backend/fabric.cjs
const path = require("path");
const fs = require("fs");
const { Gateway, Wallets } = require("fabric-network");

const CCP_PATH = path.join(__dirname, "..", "connection-org1.json");
const WALLET_PATH = path.join(__dirname, "wallet");

async function getContract() {
  // 1. Load the connection profile
  const ccp = JSON.parse(fs.readFileSync(CCP_PATH, "utf8"));

  // 2. Load wallet
  const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);

  // 3. Check if appUser identity exists
  const userExists = await wallet.get("appUser");
  if (!userExists) {
    throw new Error("❌ appUser identity not found in wallet. Run registerUser.js first!");
  }

  // 4. Connect to gateway
  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: "appUser",
    discovery: { enabled: true, asLocalhost: true },
  });

  // 5. Get network
  const network = await gateway.getNetwork("mychannel");

  // 6. Get smart contract
  const contract = network.getContract("certificate_cc"); // ✔ Correct chaincode name

  return contract;
}

module.exports = { getContract };

