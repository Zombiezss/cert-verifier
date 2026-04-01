/*
 * Register and enroll application user and import the identity into the wallet
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

    const userExists = await wallet.get("appUser");
    if (userExists) {
      console.log("✔ appUser already exists");
      return;
    }

    const adminIdentity = await wallet.get("admin");
    if (!adminIdentity) {
      console.log("❌ Admin identity not found. Run enrollAdmin.js first!");
      return;
    }

    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, "admin");

    await ca.register(
      {
        enrollmentID: "appUser",
        enrollmentSecret: "appUserpw",
        role: "client",
      },
      adminUser
    );

    const enrollment = await ca.enroll({
      enrollmentID: "appUser",
      enrollmentSecret: "appUserpw",
    });

    const userIdentity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: "Org1MSP",
      type: "X.509",
    };

    await wallet.put("appUser", userIdentity);
    console.log("🎉 Successfully registered appUser and saved to wallet");

  } catch (error) {
    console.error(`❌ Failed to register user: ${error}`);
    process.exit(1);
  }
}

main();
