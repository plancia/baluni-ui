/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useEffect, useState } from "react";
import useTokenList from "../hooks/useTokenList";
// import registryAbi from "baluni-contracts/artifacts/contracts/BaluniV1Registry.sol/BaluniV1Registry.json";
import routerAbi from "baluni-contracts/artifacts/contracts/orchestators/BaluniV1Router.sol/BaluniV1Router.json";
import {
  /* INFRA */
  depositToYearn,
  redeemFromYearn,
} from "baluni/dist/api";
// import yearnVaultAbi from "baluni/dist/api/abis/yearn/YearnVault.json";
import { TDeposit, TRedeem } from "baluni/dist/core/types/yearn";
import { waitForTx } from "baluni/dist/core/utils/web3/networkUtils";
import { Contract, ethers } from "ethers";
import { erc20ABI, useWalletClient } from "wagmi";
import Spinner from "~~/components/Spinner";
import { clientToSigner } from "~~/utils/ethers";
import { notification } from "~~/utils/scaffold-eth";

/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable @typescript-eslint/no-unused-vars */

const VAULTS_API = "https://ydaemon.yearn.fi/137/vaults/all";

type Token = {
  name: string;
  symbol: string;
  token: string;
  address: string;
  percentage: number;
  balance: number;
  logoURI: string;
};

type Vault = {
  vaultAddress: string;
  vaultName: string;
  vaultSymbol: string;
  tokenAddress: string;
  tokenSymbol: string;
};

interface YVault {
  display_name: string;
  display_symbol: string;
  address: string;
  token: Token;
  vaultAddress: string;
  vaultName: string;
  vaultSymbol: string;
}

const YVaultBox = () => {
  const { data: signer } = useWalletClient();
  const [router, setRouter] = useState<string | undefined>();
  const { tokens } = useTokenList();

  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("1");
  const [activeForm, setActiveForm] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    async function fetchVaults() {
      if (!signer) return;

      try {
        setLoading(true);
        const response = await fetch(VAULTS_API);
        const data: Vault[] = await response.json();
        console.log("Fetched vault data:", data); // Debug statement
        setVaults(data);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch vaults:", error);
        setLoading(false);
      }
    }

    fetchVaults();
  }, [signer]);

  /* useEffect(() => {
    async function callSetContract() {
      if (!signer) return;
      try {
        await setContract();
      } catch (error) {
        console.error("Failed to set contracts:", error);
      }
    }

    callSetContract();
  }, [signer]); */

  /* const setContract = async () => {
    const registry = new Contract(INFRA["137"].REGISTRY, registryAbi.abi, clientToSigner(signer as any));
    const _router = await registry.getBaluniRouter();
    setRouter(_router);
  };
 */
  const handleDeposit = async (vaultAddress: string, amount: string, tokenAddress: string) => {
    if (!signer || !router) return;

    const wallet = clientToSigner(signer as any);
    const tokenContract = new Contract(tokenAddress, erc20ABI, wallet);
    const decimals = await tokenContract.decimals();

    const params: TDeposit = {
      wallet: wallet as any,
      tokenAddr: vaultAddress,
      pool: String(vaultAddress),
      amount: ethers.utils.parseUnits(amount, decimals),
      receiver: await wallet.getAddress(),
      chainId: "137",
    };

    const data = await depositToYearn(
      params.wallet,
      params.tokenAddr,
      params.pool,
      params.amount,
      params.receiver,
      params.chainId,
    );

    if (data?.Approvals.length > 0) {
      for (const approval of data.Approvals) {
        const approvalTx = (await signer.sendTransaction(approval)) as any;
        await waitForTx(wallet.provider, approvalTx.hash, await wallet.getAddress());
      }
    }

    if (data?.Calldatas.length > 0) {
      const routerCtx = new Contract(String(router), routerAbi.abi, wallet);
      const simulate = await routerCtx.callStatic.execute(data.Calldatas, data.TokensReturn);

      if (!simulate) {
        notification.error("Simulation failed");
        return;
      }

      notification.success("Simulation successful");

      const tx = {
        to: routerCtx.address,
        value: 0,
        data: routerCtx.interface.encodeFunctionData("execute", [data.Calldatas, data.TokensReturn]),
      };

      const executeTx = await wallet.sendTransaction(tx);
      await waitForTx(wallet.provider, executeTx.hash, await wallet.getAddress());
      notification.success("Transaction broadcasted");
    }
  };

  const handleWithdraw = async (vaultAddress: string, amount: string, tokenAddress: string) => {
    if (!signer || !router) return;

    const wallet = clientToSigner(signer as any);
    const tokenContract = new Contract(tokenAddress, erc20ABI, wallet);
    const decimals = await tokenContract.decimals();

    const params: TRedeem = {
      wallet: wallet as any,
      pool: vaultAddress,
      amount: ethers.utils.parseUnits(amount, decimals),
      receiver: await wallet.getAddress(),
      chainId: "137",
    };

    const data = await redeemFromYearn(params.wallet, params.pool, params.amount, params.receiver, params.chainId);

    if (data?.Approvals.length > 0) {
      for (const approval of data.Approvals) {
        const approvalTx = await wallet.sendTransaction(approval);
        await waitForTx(wallet.provider, approvalTx.hash, await wallet.getAddress());
      }
    }

    if (data?.Calldatas.length > 0) {
      const routerCtx = new Contract(String(router), routerAbi.abi, wallet);
      const simulate = await routerCtx.callStatic.execute(data.Calldatas, data.TokensReturn);

      if (!simulate) {
        notification.error("Simulation failed");
        return;
      }

      const tx = await routerCtx.execute(data.Calldatas, data.TokensReturn);
      await waitForTx(wallet.provider, tx.hash, await wallet.getAddress());
      notification.success("Transaction broadcasted");
    }
  };

  const getTokenIcon = (address: string) => {
    const token = tokens?.find((t: any) => t.address.toLowerCase() === address.toLowerCase()) as Token | undefined;
    return token ? token.logoURI : undefined;
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 w-full sm:w-3/4 md:w-3/4 lg:w-3/3 xl:w-3/4 mx-auto">
        <div className="card bg-base-100 p-10">
          <h2 className="card-title text-3xl mb-8">Yearn Vaults</h2>
          <input
            type="text"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="input input-bordered w-full mb-4"
          />
          <ul className="space-y-4">
            {vaults.map((vault: any) => (
              <li key={vault.address} className="bg-base-100 shadow-md rounded-lg p-4 space-y-2 text-base-content">
                <div className="flex flex-col justify-between">
                  <div className="flex flex-col space-y-2">
                    <span className="font-semibold text-lg">{vault.display_name}</span>
                    <div className="flex space-x-2 text-2xl">
                      <span>{vault.display_symbol}</span>
                      {vault.address && (
                        <img
                          src={getTokenIcon(vault.token.address)}
                          alt={vault.tokenSymbol}
                          className="mask mask-circle w-10 h-10"
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex space-x-2">
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          setActiveForm(prevState => ({
                            ...prevState,
                            [vault.vaultAddress]: prevState[vault.vaultAddress] === "deposit" ? "" : "deposit",
                          }));
                        }}
                      >
                        {activeForm[vault.vaultAddress] === "deposit" ? "Cancel" : "Deposit"}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          setActiveForm(prevState => ({
                            ...prevState,
                            [vault.vaultAddress]: prevState[vault.vaultAddress] === "withdraw" ? "" : "withdraw",
                          }));
                        }}
                      >
                        {activeForm[vault.vaultAddress] === "withdraw" ? "Cancel" : "Withdraw"}
                      </button>
                    </div>
                  </div>
                  {activeForm[vault.vaultAddress] === "deposit" && (
                    <div className="p-4 mt-4 bg-base-300 rounded-md">
                      <input
                        type="text"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="input input-bordered w-full mb-4"
                      />
                      <button
                        className="btn btn-primary w-full"
                        onClick={() => handleDeposit(vault.vaultAddress, amount, vault.tokenAddress)}
                        disabled={loading}
                      >
                        {loading ? "Processing..." : `Deposit ${amount}`}
                      </button>
                    </div>
                  )}
                  {activeForm[vault.vaultAddress] === "withdraw" && (
                    <div className="p-4 mt-4 bg-base-300 rounded-md">
                      <input
                        type="text"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="input input-bordered w-full mb-4"
                      />
                      <button
                        className="btn btn-danger w-full"
                        onClick={() => handleWithdraw(vault.vaultAddress, amount, vault.tokenAddress)}
                        disabled={loading}
                      >
                        {loading ? "Processing..." : `Withdraw ${amount}`}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default YVaultBox;
