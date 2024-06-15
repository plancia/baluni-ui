import React from "react";
import YVaultBox from "../../components/yVaultBox";
import { NextPage } from "next";

const YVaults: NextPage = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 ">
      <div className="text-center font-bold mx-auto my-10 text-6xl">Vaults</div>
      <div className="text-center mx-auto my-10 text-base font-semibold ">
        ⚖️ Select some tokens that you hold in your wallet, assign them a weight, and let Baluni handle the rest.
      </div>
      <div className=" w-fit my-10 mx-20">
        <div className="text-left my-1 text-base font-light ">Protocol: Yearn</div>{" "}
        <img
          src="https://assets.odos.xyz/landingPage/logo_white_transparent.png"
          alt=""
          className="bg-black w-180 h-20 rounded-xl"
        />{" "}
      </div>

      <YVaultBox />
      <div className="text-center  mx-auto my-10 text-sm font-semibold ">
        🪄 Check the console to see the magic happen{" "}
      </div>
    </div>
  );
};

export default YVaults;
