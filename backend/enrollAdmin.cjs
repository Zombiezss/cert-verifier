/*
 * Enroll the admin user and import the identity into the wallet
 */

const FabricCAServices = require("fabric-ca-client");
const { Wallets } = require("fabric-network");
const path = require("path");
const fs = require("fs");

async function main() {
  try {
    const ccpPath = path.resolve(__dirname, "..", "connection-org1.json");
    const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

    const caURL = ccp.certificateAuthorities["ca.org1.example.com"].url;
    const ca = new FabricCAServices(caURL);

    const walletPath = path.join(__dirname, "wallet");
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`👜 Wallet path: ${walletPath}`);

    const adminExists = await wallet.get("admin");
    if (adminExists) {
      console.log("✔ Admin identity already exists");
      return;
    }

    const enrollment = await ca.enroll({
      enrollmentID: "admin",
      enrollmentSecret: "adminpw",
    });

    const identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: "Org1MSP",
      type: "X.509",
    };

    await wallet.put("admin", identity);
    console.log("🎉 Successfully enrolled admin and saved to wallet");

  } catch (error) {
    console.error(`❌ Failed to enroll admin: ${error}`);
    process.exit(1);
  }
}

main();
