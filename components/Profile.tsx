"use client";

import { useState } from "react";
import { LuRefreshCw } from "react-icons/lu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FiUser } from "react-icons/fi";

interface ProfileProps {
  email: string;
  password: string;
  storageUsed: number;
  storageTotalMB: number;
  generateRandomEmail: () => void;
  getInitials: (rawEmail: string) => string;
  formatStorage: (used: number) => string;
  createAccount: (username: string, customPassword: string) => Promise<void>;
  domain: string;
}

export default function Profile({
  email,
  password,
  storageUsed,
  storageTotalMB,
  generateRandomEmail,
  getInitials,
  formatStorage,
  createAccount,
  domain,
}: ProfileProps) {
  const [username, setUsername] = useState("");
  const [customPassword, setCustomPassword] = useState("");

  return (
    <Popover>
      <PopoverTrigger>
        <Avatar>
          <AvatarFallback className="select-none cursor-pointer">
            {getInitials(email)}
          </AvatarFallback>
        </Avatar>
      </PopoverTrigger>
      <PopoverContent className="flex flex-col space-y-4">
        <div className="flex gap-3 items-center p-1">
          <Avatar>
            <AvatarFallback>{getInitials(email)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-semibold text-sm">{email || "No email yet"}</h1>
            <p className="text-xs text-[#7e7e7e]">
              {password || "No password yet"}
            </p>
          </div>
        </div>
        <hr />
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-500">{formatStorage(storageUsed)}</p>
          <Progress value={(storageUsed / (storageTotalMB * 1024 * 1024)) * 100} />
        </div>
        <hr />
        <button
          className="flex items-center gap-2 font-semibold transition-all hover:text-[#646464]"
          onClick={generateRandomEmail}
        >
          <LuRefreshCw />
          <p className="text-sm">Generate Random Email</p>
        </button>
        {/* Create New Account Dialog */}
        <Dialog>
          <DialogTrigger>
            <div className="flex items-center gap-2 font-semibold transition-all hover:text-[#646464] cursor-pointer">
              <FiUser />
              <p className="text-sm">Create New Account</p>
            </div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create an account</DialogTitle>
            </DialogHeader>
            <p>Email:</p>
            <div className="flex items-center">
              <Input
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <Button variant="outline">@{domain || "loading..."}</Button>
            </div>
            <p>Password:</p>
            <Input
              type="password"
              placeholder="******"
              value={customPassword}
              onChange={(e) => setCustomPassword(e.target.value)}
            />
            <div className="flex items-center gap-3 mt-4">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setUsername("");
                  setCustomPassword("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                className="w-full"
                onClick={async () => {
                  await createAccount(username, customPassword);
                  setUsername("");
                  setCustomPassword("");
                }}
              >
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <hr />
        <div className="text-gray-500 text-xs">
          Created using{" "}
          <a
            href="https://mail.tm/"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            mail.tm
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}
