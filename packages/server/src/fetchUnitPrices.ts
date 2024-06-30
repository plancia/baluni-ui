import baluniPoolAbi from "baluni-contracts/artifacts/contracts/pools/BaluniV1Pool.sol/BaluniV1Pool.json";
import baluniPoolRegistryAbi from "baluni-contracts/artifacts/contracts/registry/BaluniV1PoolRegistry.sol/BaluniV1PoolRegistry.json";
import baluniVaultRegistryAbi from "baluni-contracts/artifacts/contracts/registry/BaluniV1YearnVaultRegistry.sol/BaluniV1YearnVaultRegistry.json";
import baluniVaultAbi from "baluni-contracts/artifacts/contracts/vaults/BaluniV1YearnVault.sol/BaluniV1YearnVault.json";
import dotenv from "dotenv";
import { Contract, ethers } from "ethers";
import path from "path";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import baluniDCAVaultAbi from "baluni-contracts/artifacts/contracts/vaults/BaluniV1DCAVault.sol/BaluniV1DCAVault.json";
import baluniDCAVaultRegistryAbi from "baluni-contracts/artifacts/contracts/registry/BaluniV1DCAVaultRegistry.sol/BaluniV1DCAVaultRegistry.json";
import contracts from "baluni-contracts/deployments/deployedContracts.json";
import baluniRegistryAbi from "baluni-contracts/artifacts/contracts/registry/BaluniV1Registry.sol/BaluniV1Registry.json";

dotenv.config();

const provider = new ethers.providers.JsonRpcProvider(String(process.env.RPC_URL));

let registryCtx: Contract;

async function setup() {
  const chainId = await provider.getNetwork().then(network => network.chainId);
  if (chainId === 137) {
    const registryAddress = contracts[137].BaluniV1Registry;
    if (!registryAddress) {
      console.error(`Address not found for chainId: ${chainId}`);
      return;
    }
    registryCtx = new ethers.Contract(registryAddress, baluniRegistryAbi.abi, provider);
  }
}

async function fetchAndStoreUnitPrice(contract: Contract, address: string, db: any) {
  try {
    const unitPrice = await contract.unitPrice();
    const unitPriceData = {
      timestamp: new Date().toISOString(),
      unitPrice: unitPrice.toString(),
      address: address,
    };

    await db.run(
      "INSERT INTO unitPrices (timestamp, unitPrice, address) VALUES (?, ?, ?)",
      unitPriceData.timestamp,
      unitPriceData.unitPrice,
      unitPriceData.address,
    );

    console.log("Unit Price data updated:", unitPriceData);
  } catch (error) {
    console.error(`Error fetching unit price for address ${address}:`, error);
  }
}

const fetchUnitPrices = async () => {
  await setup();

  if (!registryCtx) {
    return;
  }

  const db = await open({
    filename: path.join(__dirname, "..", "baluniData.db"),
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS unitPrices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      unitPrice TEXT NOT NULL,
      address TEXT NOT NULL
    )
  `);

  try {
    const poolRegistry = await registryCtx.getBaluniPoolRegistry();
    const poolRegistryContract = new ethers.Contract(String(poolRegistry), baluniPoolRegistryAbi.abi, provider);
    const pools = await poolRegistryContract.getAllPools();

    for (const pool of pools) {
      const poolContract = new ethers.Contract(pool, baluniPoolAbi.abi, provider);
      await fetchAndStoreUnitPrice(poolContract, pool, db);
    }
  } catch (error) {
    console.error("Error processing pool registry:", error);
  }

  try {
    const vaultRegistry = await registryCtx.getBaluniYearnVaultRegistry();
    const vaultRegistryContract = new ethers.Contract(String(vaultRegistry), baluniVaultRegistryAbi.abi, provider);
    const vaults = await vaultRegistryContract.getAllVaults();

    for (const vault of vaults) {
      const vaultContract = new ethers.Contract(vault, baluniVaultAbi.abi, provider);
      await fetchAndStoreUnitPrice(vaultContract, vault, db);
    }
  } catch (error) {
    console.error("Error processing vault registry:", error);
  }

  try {
    const dcaVaultRegistry = await registryCtx.getBaluniDCAVaultRegistry();
    const dcaVaultRegistryContract = new ethers.Contract(
      String(dcaVaultRegistry),
      baluniDCAVaultRegistryAbi.abi,
      provider,
    );
    const dcaVaults = await dcaVaultRegistryContract.getAllVaults();

    for (const vault of dcaVaults) {
      const vaultContract = new ethers.Contract(vault, baluniDCAVaultAbi.abi, provider);
      await fetchAndStoreUnitPrice(vaultContract, vault, db);
    }
  } catch (error) {
    console.error("Error processing DCA vault registry:", error);
  }

  await db.close();
};

async function main() {
  await setup();
  if (registryCtx) {
    fetchUnitPrices(); // Initial fetch
    setInterval(fetchUnitPrices, Number(process.env.INTERVAL)); // Fetch every interval
  }
}

main().catch(error => console.error("Error in main execution:", error));
