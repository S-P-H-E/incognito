"use client";

import { LuMail } from "react-icons/lu";
import { FaRegCircleCheck } from "react-icons/fa6";
import Profile from "@/components/Profile";

interface NavbarProps {
  email: string;
  copied: boolean;
  handleCopy: () => void;
  generateRandomEmail: () => void;
  getInitials: (rawEmail: string) => string;
  formatStorage: (used: number) => string;
  password: string;
  storageUsed: number;
  storageTotalMB: number;
  createAccount: (username: string, customPassword: string) => Promise<void>;
  domain: string;
}

export default function Navbar({
  email,
  copied,
  handleCopy,
  generateRandomEmail,
  getInitials,
  formatStorage,
  password,
  storageUsed,
  storageTotalMB,
  createAccount,
  domain,
}: NavbarProps) {
  return (
    <div className="flex flex-row px-9 py-6 border-b-2 border-b-[#f6f5f7] justify-between items-center">
      <button
        onClick={handleCopy}
        className="bg-[#f5f7fa] py-2 px-4 rounded-md flex items-center gap-2 group duration-500 hover:bg-black"
      >
        <div
          className={`transition-transform duration-300 ${
            copied ? "scale-125 opacity-0" : "scale-100 opacity-100"
          }`}
        >
          <LuMail size={15} className="text-[#929292] group-hover:text-white" />
        </div>
        <div
          className={`absolute transition-transform duration-300 ${
            copied ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
        >
          <FaRegCircleCheck size={15} className="text-green-500" />
        </div>
        <p className="text-[#929292] group-hover:text-white">
          {email || "No email generated yet"}
        </p>
      </button>
      <Profile
        email={email}
        password={password}
        storageUsed={storageUsed}
        storageTotalMB={storageTotalMB}
        generateRandomEmail={generateRandomEmail}
        getInitials={getInitials}
        formatStorage={formatStorage}
        createAccount={createAccount}
        domain={domain}
      />
    </div>
  );
}
