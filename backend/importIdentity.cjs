// backend/importIdentity.cjs
const { Wallets } = require("fabric-network");
const fs = require("fs");
const path = require("path");

async function main() {
  const walletPath = path.join(__dirname, "wallet");
  const wallet = await Wallets.newFileSystemWallet(walletPath);

  const identityLabel = "appUser";
  const existing = await wallet.get(identityLabel);
  if (existing) {
    console.log("appUser already in wallet");
    return;
  }

  // Paths to the cert/key inside WSL (Ubuntu)
  const certPath =
    "\\\\wsl.localhost\\Ubuntu\\home\\anashree__\\go\\src\\github.com\\anashree\\fabric-samples\\test-network\\organizations\\peerOrganizations\\org1.example.com\\users\\User1@org1.example.com\\msp\\signcerts\\cert.pem";

  const keyDir =
    "\\\\wsl.localhost\\Ubuntu\\home\\anashree__\\go\\src\\github.com\\anashree\\fabric-samples\\test-network\\organizations\\peerOrganizations\\org1.example.com\\users\\User1@org1.example.com\\msp\\keystore";

  const keyFile = fs.readdirSync(keyDir)[0];
  const keyPath = path.join(keyDir, keyFile);

  const cert = fs.readFileSync(certPath).toString();
  const key = fs.readFileSync(keyPath).toString();

  const identity = {
    credentials: {
      certificate: cert,
      privateKey: key,
    },
    mspId: "Org1MSP",
    type: "X.509",
  };

  await wallet.put(identityLabel, identity);
  console.log("✅ appUser imported into backend/wallet");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
