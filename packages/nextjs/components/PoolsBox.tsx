"use client";

import React, { useEffect, useState } from "react";
import useTokenList from "../hooks/useTokenList";
import baluniPoolAbi from "baluni-contracts/artifacts/contracts/pools/BaluniV1Pool.sol/BaluniV1Pool.json";
import poolPeripheryAbi from "baluni-contracts/artifacts/contracts/pools/BaluniV1PoolPeriphery.sol/BaluniV1PoolPeriphery.json";
import poolRegistryAbi from "baluni-contracts/artifacts/contracts/registry/BaluniV1PoolRegistry.sol/BaluniV1PoolRegistry.json";
import registryAbi from "baluni-contracts/artifacts/contracts/registry/BaluniV1Registry.sol/BaluniV1Registry.json";
import { INFRA } from "baluni/dist/api/";
import { Contract, ethers } from "ethers";
import { erc20ABI, useWalletClient } from "wagmi";
import Spinner from "~~/components/Spinner";
import { clientToSigner } from "~~/utils/ethers";
import { notification } from "~~/utils/scaffold-eth";

/* eslint-disable @next/next/no-img-element */

interface DeviationData {
  symbol: string;
  direction: boolean;
  deviation: string;
  targetWeight: string;
  currentWeight: string;
}

interface TokenBalance {
  fromTokenBalance: string;
  toTokenBalance: string;
}

interface LiquidityData {
  amounts: string[];
  tokens: string[];
  poolAddress: string;
}

interface RemoveLiquidityData {
  poolAddress: string;
  amount: string;
}

interface Token {
  symbol: string;
  logoURI: string;
}

const PoolsBox = () => {
  const { data: signer } = useWalletClient();
  const { tokens } = useTokenList();

  const [poolFactory, setPoolFactory] = useState<string | undefined>();
  const [poolPeriphery, setPoolPeriphery] = useState<string | undefined>();

  const [, /* tokenBalances */ setTokenBalances] = useState<TokenBalance>({
    fromTokenBalance: "0",
    toTokenBalance: "0",
  });

  const [pools, setPools] = useState<string[]>([]);
  const [poolSymbols, setPoolSymbols] = useState<{ [key: string]: string }>({});
  const [liquidityBalances, setLiquidityBalances] = useState<{ [key: string]: string }>({});
  const [deviations, setDeviations] = useState<{ [key: string]: DeviationData[] }>({});
  const [liquidityData, setLiquidityData] = useState<LiquidityData>({
    amounts: [],
    tokens: [],
    poolAddress: "",
  });
  const [removeLiquidityData, setRemoveLiquidityData] = useState<RemoveLiquidityData>({
    poolAddress: "",
    amount: "",
  });
  const [activeForm, setActiveForm] = useState<{ [key: string]: string }>({});
  const [modalData, setModalData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!signer) return;
    setContract();
  }, [signer]);

  useEffect(() => {
    const fetchData = async () => {
      if (!signer) return;
      setLoading(true);
      try {
        await getPools();
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };

    fetchData();

    const intervalId = setInterval(fetchData, 30000);

    return () => clearInterval(intervalId);
  }, [signer, poolFactory]);

  const setContract = async () => {
    const registry = new Contract(INFRA[137].REGISTRY, registryAbi.abi, clientToSigner(signer as any));
    const poolFactory = await registry.getBaluniPoolFactory();
    const poolPeriphery = await registry.getBaluniPoolPeriphery();
    setPoolFactory(poolFactory);
    setPoolPeriphery(poolPeriphery);
  };

  if (loading) {
    return <Spinner />;
  }

  const getPools = async () => {
    if (!signer || !poolFactory || !poolPeriphery) return;
    const factory = new ethers.Contract(poolFactory, poolRegistryAbi.abi, clientToSigner(signer));
    const poolAddresses = await factory.getAllPools();
    setPools(poolAddresses);

    const balances: { [key: string]: string } = {};
    const symbols: { [key: string]: string } = {};
    const deviationsData: { [key: string]: DeviationData[] } = {};

    for (const poolAddress of poolAddresses) {
      const pool = new ethers.Contract(poolAddress, baluniPoolAbi.abi, clientToSigner(signer));
      const balance = await pool.balanceOf(signer.account.address);
      balances[poolAddress] = ethers.utils.formatUnits(balance, 18);

      const poolAssets = await pool.getAssets();
      const assetContracts = poolAssets.map(
        (asset: string) => new ethers.Contract(asset, erc20ABI, clientToSigner(signer)),
      );
      const assetSymbols = await Promise.all(
        assetContracts.map((contract: { symbol: () => any }) => contract.symbol()),
      );
      symbols[poolAddress] = assetSymbols.join(" / ");

      const poolERC20 = new ethers.Contract(poolAddress, erc20ABI, clientToSigner(signer));
      const totalSupply = await poolERC20.totalSupply();

      let deviationsArray: string[] = [];
      let directionsArray: boolean[] = [];

      if (totalSupply.toString() !== "0") {
        [directionsArray, deviationsArray] = await pool.getDeviation();
      }

      const weights = await pool.getWeights();

      deviationsData[poolAddress] = assetSymbols.map((symbol, index) => ({
        symbol,
        direction: directionsArray[index],
        deviation: deviationsArray[index],
        targetWeight: weights[index],
        currentWeight: directionsArray[index]
          ? (Number(weights[index]) + Number(deviationsArray[index])).toString()
          : (Number(weights[index]) - Number(deviationsArray[index])).toString(),
      }));
    }

    setLiquidityBalances(balances);
    setPoolSymbols(symbols);
    setDeviations(deviationsData);
  };

  const fetchTokenBalance = async (tokenAddress: string, account: string) => {
    const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, clientToSigner(signer as any));
    const balance = await tokenContract.balanceOf(account);
    const decimals = await tokenContract.decimals();
    return ethers.utils.formatUnits(balance, decimals);
  };

  const handleInputChange = async (
    e: React.ChangeEvent<HTMLSelectElement> | React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<any>>,
  ) => {
    if (!signer) return;

    const { name, value } = e.target;
    setter((prevState: any) => ({ ...prevState, [name]: value }));

    if (name === "fromToken" || name === "toToken" || name === "token") {
      const account = signer.account.address;
      if ((name === "fromToken" || name === "token") && value) {
        const balance = await fetchTokenBalance(value, account);
        setTokenBalances(prevState => ({ ...prevState, fromTokenBalance: balance }));
      } else if (name === "toToken" && value) {
        const balance = await fetchTokenBalance(value, account);
        setTokenBalances(prevState => ({ ...prevState, toTokenBalance: balance }));
      }
    }
  };

  const handlePoolClick = async (poolAddress: string) => {
    if (!signer) return;

    const pool = new ethers.Contract(poolAddress, baluniPoolAbi.abi, clientToSigner(signer));
    const tokens = await pool.getAssets();

    setLiquidityData({
      amounts: new Array(tokens.length).fill(""),
      tokens,
      poolAddress,
    });

    setRemoveLiquidityData({
      ...removeLiquidityData,
      poolAddress,
    });
  };

  const handleAddLiquidity = async () => {
    const { amounts, tokens, poolAddress } = liquidityData;
    if (!poolAddress) return notification.error("Select pool first!");
    if (!signer || !amounts.every(amount => amount) || !tokens.every(token => token)) return;

    const decimals: number[] = [];

    for (const token of tokens) {
      const tokenContract = new ethers.Contract(token, erc20ABI, clientToSigner(signer));
      decimals.push(await tokenContract.decimals());

      const allowance = await tokenContract.allowance(signer.account.address, poolPeriphery);

      if (allowance.lt(ethers.utils.parseUnits(amounts[tokens.indexOf(token)], await tokenContract.decimals()))) {
        const approveTx = await tokenContract.approve(
          poolPeriphery,
          ethers.utils.parseUnits(amounts[tokens.indexOf(token)], await tokenContract.decimals()),
        );
        await approveTx.wait();
      }
    }

    const periphery = new ethers.Contract(poolPeriphery!, poolPeripheryAbi.abi, clientToSigner(signer));
    try {
      const parsedAmounts = amounts.map((amount, index) => ethers.utils.parseUnits(amount, decimals[index]));
      const tx = await periphery.addLiquidity(parsedAmounts, poolAddress, signer.account.address);
      await tx.wait();
      notification.success("Liquidity added successfully!");
    } catch (error) {
      console.error("Add liquidity failed:", error);
    }
  };

  const handleRebalanceWeight = async () => {
    try {
      if (!signer) return;

      const { tokens, poolAddress } = liquidityData;
      const periphery = new ethers.Contract(poolPeriphery!, poolPeripheryAbi.abi, clientToSigner(signer));

      for (const token of tokens) {
        const tokenContract = new ethers.Contract(token, erc20ABI, clientToSigner(signer));

        const allowance = await tokenContract.allowance(signer.account.address, periphery.address);

        if (allowance.lt(ethers.constants.MaxUint256)) {
          const approveTx = await tokenContract.approve(periphery.address, ethers.constants.MaxUint256);
          await approveTx.wait();
        }
      }

      const tx = await periphery.rebalanceWeights(poolAddress, signer.account.address);
      await tx.wait();
      notification.success("Rebalanced weights successfully!");
    } catch (error: any) {
      notification.error(String(error?.reason));
    }
  };

  const handleRemoveLiquidity = async () => {
    const { poolAddress, amount } = removeLiquidityData;
    if (!signer || !poolAddress || !amount) return;
    const periphery = new ethers.Contract(poolPeriphery!, poolPeripheryAbi.abi, clientToSigner(signer));
    const tokenContract = new ethers.Contract(poolAddress, baluniPoolAbi.abi, clientToSigner(signer));
    const allowance = await tokenContract.allowance(signer.account.address, periphery.address);

    if (allowance.lt(ethers.utils.parseUnits(amount, 18))) {
      const approveTx = await tokenContract.approve(periphery.address, ethers.utils.parseUnits(amount, 18));
      await approveTx.wait();
    }

    const shares = ethers.utils.parseUnits(amount, 18);
    try {
      const tx = await periphery.removeLiquidity(shares, poolAddress, signer.account.address);
      await tx.wait();
      notification.success("Liquidity removed successfully!");
    } catch (error) {
      console.error("Remove liquidity failed:", error);
    }
  };

  const handleRebalance = async (poolAddress: string) => {
    if (!signer) return;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const periphery = new ethers.Contract(poolPeriphery!, poolPeripheryAbi.abi, clientToSigner(signer));
    try {
      const tx = await periphery.performRebalanceIfNeeded(poolAddress);
      await tx.wait();
      notification.success("Rebalance performed successfully!");
    } catch (error) {
      console.error("Rebalance failed:", error);
    }
  };

  const openModal = async (poolAddress: string) => {
    if (!signer) return;

    const pool = new ethers.Contract(poolAddress, baluniPoolAbi.abi, clientToSigner(signer));
    const assets = await pool.getAssets();
    const reserves = await pool.getReserves();
    const symbols = await Promise.all(
      assets.map(async (asset: string) => {
        const assetContract = new ethers.Contract(asset, erc20ABI, clientToSigner(signer));
        return assetContract.symbol();
      }),
    );
    const decimals = await Promise.all(
      assets.map(async (asset: string) => {
        const assetContract = new ethers.Contract(asset, erc20ABI, clientToSigner(signer));
        return assetContract.decimals();
      }),
    );
    const totalLiquidity = await pool.liquidity();
    const deviationsData = deviations[poolAddress];

    const assetWeights = await Promise.all(
      assets.map(async (asset: any, index: any) => {
        const assetWeight = await pool.assetLiquidity(index);
        return (assetWeight / totalLiquidity) * 100;
      }),
    );

    const unitPrice = ((await pool.totalSupply()) / (totalLiquidity * 1e12)) * 1e18;

    setModalData({
      address: poolAddress,
      assets: symbols.map((symbol, index) => ({
        symbol,
        reserve: ethers.utils.formatUnits(reserves[index], decimals[index]),
        decimals: decimals[index],
        deviation: deviationsData[index].deviation,
        direction: deviationsData[index].direction,
        weight: assetWeights[index],
        targetWeight: deviationsData[index].targetWeight,
        currentWeight: deviationsData[index].currentWeight,
      })),
      totalLiquidity: Number(totalLiquidity),
      unitPrice: Number(unitPrice / 1e18),
    });

    const poolInfoModal = document.querySelector<HTMLInputElement>("#pool-info-modal");
    if (poolInfoModal) {
      poolInfoModal.checked = true;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 w-full sm:w-3/4 md:w-3/4 lg:w-3/3 xl:w-3/4 mx-auto">
        <div className="card bg-base-100 p-10">
          <h2 className="card-title text-3xl mb-8">Pairs</h2>
          <ul className="space-y-4">
            {pools.map((pool, index) => (
              <li key={index} className="bg-base-100 shadow-md rounded-lg p-4 space-y-2 text-base-content">
                <div className="flex flex-col justify-between">
                  <div className="flex flex-col space-y-2">
                    <span className="font-semibold text-lg hover:underline" onClick={() => handlePoolClick(pool)}>
                      {poolSymbols[pool] || pool}
                    </span>
                    <div className="flex space-x-2 text-2xl">
                      {poolSymbols[pool] &&
                        poolSymbols[pool].split(" / ").map((symbol, index) => {
                          const token = tokens.find((token: Token) => token.symbol === symbol) as unknown as Token;
                          return token ? (
                            <img key={index} src={token.logoURI} alt={symbol} className="mask mask-circle w-10 h-10" />
                          ) : null;
                        })}
                    </div>
                    <span className="text-sm">Your Liquidity: {Number(liquidityBalances[pool]) || "0"}</span>
                    <span>
                      Deviation:{" "}
                      {deviations[pool] ? (
                        <>
                          {deviations[pool].map((deviation, index) => (
                            <span key={index}>
                              {deviation.direction ? "" : "-"}
                              {Number(deviation.deviation) / 100}%{index < deviations[pool].length - 1 && " / "}
                            </span>
                          ))}
                        </>
                      ) : (
                        "N/A"
                      )}
                    </span>
                    <span>
                      Current Weights:{" "}
                      {deviations[pool] ? (
                        <>
                          {deviations[pool].map((deviation, index) => (
                            <span key={index}>
                              {Number(deviation.currentWeight) / 100}%{index < deviations[pool].length - 1 && " / "}
                            </span>
                          ))}
                        </>
                      ) : (
                        "N/A"
                      )}
                    </span>
                    <span>
                      Target Weights:{" "}
                      {deviations[pool] ? (
                        <>
                          {deviations[pool].map((deviation, index) => (
                            <span key={index}>
                              {Number(deviation.targetWeight) / 100}%{index < deviations[pool].length - 1 && " / "}
                            </span>
                          ))}
                        </>
                      ) : (
                        "N/A"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <button className="btn btn-sm btn-info" onClick={() => openModal(pool)}>
                      Info
                    </button>
                    <div className="flex space-x-2">
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          setActiveForm(prevState => ({
                            ...prevState,
                            [pool]: prevState[pool] === "add" ? "" : "add",
                          }));
                          handlePoolClick(pool);
                        }}
                      >
                        Add Liquidity
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          setActiveForm(prevState => ({
                            ...prevState,
                            [pool]: prevState[pool] === "remove" ? "" : "remove",
                          }));
                          handlePoolClick(pool);
                        }}
                      >
                        Remove Liquidity
                      </button>
                    </div>
                  </div>
                  {activeForm[pool] === "add" && (
                    <div className="p-4 mt-4 bg-base-300 rounded-md">
                      {liquidityData.tokens.map((token, index) => (
                        <div key={index}>
                          <input
                            type="text"
                            name={`amount${index}`}
                            className="input input-bordered w-full mb-2"
                            placeholder={`Amount ${index + 1}`}
                            value={liquidityData.amounts[index]}
                            onChange={e => {
                              const newAmounts = [...liquidityData.amounts];
                              newAmounts[index] = e.target.value;
                              setLiquidityData(prevState => ({
                                ...prevState,
                                amounts: newAmounts,
                              }));
                            }}
                          />
                          <input
                            type="text"
                            name={`token${index}`}
                            className="input input-bordered w-full mb-2"
                            placeholder={`Token ${index + 1}`}
                            value={liquidityData.tokens[index]}
                            onChange={e => {
                              const newTokens = [...liquidityData.tokens];
                              newTokens[index] = e.target.value;
                              setLiquidityData(prevState => ({
                                ...prevState,
                                tokens: newTokens,
                              }));
                              handleInputChange(e, setLiquidityData);
                            }}
                          />
                        </div>
                      ))}
                      <button className="btn btn-primary w-full" onClick={handleAddLiquidity}>
                        Add Liquidity
                      </button>
                      <button className="btn btn-primary w-full my-4" onClick={handleRebalanceWeight}>
                        Rebalance and Add
                      </button>
                    </div>
                  )}
                  {activeForm[pool] === "remove" && (
                    <div className="p-4 mt-4 bg-base-300 rounded-md">
                      <input
                        type="text"
                        name="amount"
                        className="input input-bordered w-full mb-4"
                        placeholder="Amount"
                        value={removeLiquidityData.amount}
                        onChange={e => handleInputChange(e, setRemoveLiquidityData)}
                      />
                      <button className="btn btn-danger w-full" onClick={handleRemoveLiquidity}>
                        Remove Liquidity
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
        {modalData && (
          <div className="p-4 bg-base-300 shadow rounded">
            <input type="checkbox" id="pool-info-modal" className="modal-toggle" />
            <div className="modal">
              <div className="modal-box relative">
                <label htmlFor="pool-info-modal" className="btn btn-sm btn-circle absolute right-2 top-2 text-red-500">
                  ✕
                </label>
                <h2 className="text-2xl mb-4 text-blue-700">Pool Info</h2>
                <p className="text-lg mb-2">
                  <strong className="text-gray-700">Address:</strong> {modalData.address}
                </p>
                <p className="text-xl mb-2">
                  <strong className="text-gray-700 text-xl">Total Liquidity:</strong>{" "}
                  {Number(ethers.utils.formatUnits(modalData.totalLiquidity, 6)).toFixed(4)} USD
                </p>
                {modalData.assets.map(
                  (
                    asset: {
                      symbol:
                        | string
                        | number
                        | bigint
                        | boolean
                        | React.ReactElement<any, string | React.JSXElementConstructor<any>>
                        | Iterable<React.ReactNode>
                        | Promise<React.AwaitedReactNode>
                        | null
                        | undefined;
                      reserve:
                        | string
                        | number
                        | bigint
                        | boolean
                        | React.ReactElement<any, string | React.JSXElementConstructor<any>>
                        | Iterable<React.ReactNode>
                        | React.ReactPortal
                        | Promise<React.AwaitedReactNode>
                        | null
                        | undefined;
                      weight: any;
                      direction: any;
                      deviation: any;
                      targetWeight: any;
                      currentWeight: any;
                    },
                    index: React.Key | null | undefined,
                  ) => {
                    const token = tokens.find((token: Token) => token.symbol === asset.symbol) as unknown as Token;
                    return (
                      <div key={index} className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center">
                          {token && (
                            <img src={token.logoURI} alt={token.symbol} className="mask mask-circle w-10 h-10 mr-2" />
                          )}
                          <div>
                            <strong className="text-gray-700"> {asset.symbol}: </strong> {asset.reserve}
                          </div>
                        </div>
                        <div>
                          <p className="mb-1">
                            <strong className="text-gray-700">Weight:</strong> {Number(asset.weight).toFixed(4)}%
                          </p>
                          <p className="mb-1">
                            <strong className="text-gray-700">Deviation:</strong> {asset.direction ? "" : "-"}
                            {(Number(asset.deviation) / 100).toFixed(2)}%
                          </p>
                          <p className="mb-1">
                            <strong className="text-gray-700">Target:</strong>
                            {(Number(asset.targetWeight) / 100).toFixed(2)}%
                          </p>
                          <p className="mb-1">
                            <strong className="text-gray-700">Actual:</strong>
                            {(Number(asset.currentWeight) / 100).toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    );
                  },
                )}
                <p className="text-lg mb-4">
                  <strong className="text-gray-700">LP Price:</strong> {Number(modalData.unitPrice).toFixed(2)} USDC
                </p>
                <button className="btn btn-primary mt-4" onClick={() => handleRebalance(modalData.address)}>
                  Perform Rebalance
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PoolsBox;
