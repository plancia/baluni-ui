import React from "react";
import PoolsBox from "../../components/PoolsBox";
import { NextPage } from "next";

const Pools: NextPage = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 ">
      <div className="flex justify-center items-center">
        <div className="font-bold text-center my-10 text-6xl bg-gradient-to-r from-blue-600 via-slate-300 to-base-300 text-transparent bg-clip-text ">
          Pools
        </div>{" "}
      </div>
      <div className="collapse">
        <input type="checkbox" />
        <div className="collapse-title text-xl font-medium">Infos</div>
        <div className="collapse-content grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 my-16">
          {/* Card 1 */}

          {/* Card 2 */}
          <div className="flex flex-col items-center p-6  rounded-lg ">
            <p className="text-6xl md:text-6xl text-left mb-2 justify-center leading-2 opacity-75">
              Swap more than one ERC20 token in one tx.
            </p>
          </div>

          <div className="flex flex-col bg-base-300 items-center p-10 shadow-lg rounded-lg hover:bg-base-100 hover:text-base-content transition-all duration-300">
            <p className="text-4xl md:text-4xl text-right align-sub mb-2 justify-center leading-2 ">
              Baluni encode the best operations and batch it in a single transaction.
            </p>
            <div className="mt-8">
              <p className="text-2xl md:text-2xl text-justify leading-3 tracking-wider">
                By utilizing{" "}
                <a
                  href="https://www.odos.xyz/"
                  className="underline text-blue-600 hover:text-blue-800 transition-colors duration-300"
                >
                  ODOS
                </a>{" "}
                for routing, we ensure the best possible routing in the DeFi landscape.
                <img
                  src="https://assets.odos.xyz/landingPage/logo_white_transparent.png"
                  alt="ODOS Logo"
                  className="hover:bg-base-300 mt-2"
                />
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className=" w-fit my-10 mx-20">
        <div className="text-left my-1 text-base font-light ">Protocol: BALUNI</div>
        <img src="/favicon.png" alt="" className="w-20 h-20 rounded-xl" />{" "}
      </div>
      <PoolsBox />
    </div>
  );
};

export default Pools;
