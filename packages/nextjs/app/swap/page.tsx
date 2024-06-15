import React from "react";
import SwapBox from "../../components/SwapBox";
import { NextPage } from "next";

const Swap: NextPage = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="font-bold text-center my-10 text-6xl bg-gradient-to-r from-blue-600 via-slate-600 to-base-300 text-transparent bg-clip-text ">
        Swap
      </div>{" "}
      <div className="text-center mx-auto my-10 text-base font-semibold ">🦄 Swap your tokens</div>
      <div className=" w-fit my-10 mx-20">
        <div className="text-left my-1 text-base font-light ">Protocol: BALUNI</div>
        <img src="/favicon.png" alt="" className="w-20 h-20 rounded-xl" />{" "}
      </div>
      <SwapBox />
      <div className="text-center  mx-auto my-10 text-sm font-semibold ">
        🪄 Check the console to see the magic happen{" "}
      </div>
    </div>
  );
};

export default Swap;
