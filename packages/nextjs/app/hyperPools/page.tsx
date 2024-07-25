import React from "react";
import HyperPoolsBox from "../../components/HyperPoolsBox";
import type { NextPage } from "next";

/* eslint-disable @next/next/no-img-element */

const HyperPools: NextPage = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 ">
      <div className="flex justify-center items-center">
        <div className="font-bold text-center my-10 text-5xl md:text-6xl lg:text-7xl bg-gradient-to-r from-blue-600 via-slate-400 to-base-300 text-transparent bg-clip-text">
          Hyper Pools
        </div>
      </div>{" "}
      <HyperPoolsBox />
    </div>
  );
};

export default HyperPools;
