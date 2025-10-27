const BETA_ACCESS_WALLETS = [
  "0x9814ee514ba5ac237955f13ce97b084369e8e49d", // Limi
  "0xe47ee99de90cd4b865386a602ca0286153643415", // Lost Midas
  "0x17e738d9056cf0926ffdb0ff15da4fe64661c867", // Captain
  "0xeffdc3b00bd81cec05a5965846831333ef81c308", // Thosmur
  "0xb451db3a6420a44c8042dde989e93e36439d7639", // Griff
  "0x604ffe727bc6108ad1ad482ef4fb1d5172b2c0f6", // OxF0rce
  "0x9f2f31d1d4cba2d61f457378efd9f082307949ed", // NFT Kid
  "0x4c3b573643a32a419c516c666be1095d58817a7e", // Gist
  "0x8c4cf2ed871f71a2e4fe1aab7dfe52f873b62904", // Simon
  "0x9f03621ddba9936c479e0ba845c3521caa0a4e23", // Bill
  "0x9857d2cbd8430f4802da7cca440e66238bc8e28d",
  "0x530ea625a4cad0f0e5b62cc60e4e69a303582141",
  "0x1c3e54735d30912d391ecdf34b049d3e3743ebbb",
  "0x96127abba054403920090c65d54e5dcfb8360aa9",
  "0x755dc65333c16f388d2054513b9d013d7035f230",
  "0x04b90165090c7e6f4798e1d7e76d214fd31d3262",
  "0x1ce256752fba067675f09291d12a1f069f34f5e8",
  "0x226bc251adcf88e58fe8276a210508d6c4085121".toLowerCase()
];

export function isWhitelisted(walletAddress: string): boolean {
  const normalizedAddress = walletAddress.toLowerCase();
  console.log("Checking whitelist for address:", normalizedAddress);
  console.log("Whitelist contains:", BETA_ACCESS_WALLETS.includes(normalizedAddress));
  return BETA_ACCESS_WALLETS.includes(normalizedAddress);
}