"use client";

import { useState, useEffect } from "react";
import { LuMail } from "react-icons/lu";
import { FaRegCircleCheck } from "react-icons/fa6";
import { FiArrowLeft } from "react-icons/fi";
import Navbar from "@/components/Navbar";
import { EventSourcePolyfill } from "event-source-polyfill";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Types
interface EmailFrom {
  address: string;
  name?: string;
}
interface EmailMessage {
  id: string;
  subject: string;
  from: EmailFrom;
  intro: string;
  createdAt: string;
}
interface FullEmailMessage extends EmailMessage {
  html?: string;
  text?: string;
  // Attachments functionality removed.
}

export default function TempMail() {
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [accountId, setAccountId] = useState(""); // Account ID from mail.tm
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [fullMessage, setFullMessage] = useState<FullEmailMessage | null>(null);
  const [copied, setCopied] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);

  const storageTotalMB = 40;

  // Generate a random string (for random account generation)
  function generateRandomString(length = 8): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}[]<>?/=";
    return Array.from({ length }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("");
  }

  // Returns initials from an email
  const getInitials = (rawEmail: string) =>
    rawEmail ? rawEmail[0].toUpperCase() : "?";

  // Format storage usage: if used < 1MB then in KB, else in MB.
  const formatStorage = (used: number) => {
    const oneMB = 1024 * 1024;
    return used < oneMB
      ? `${(used / 1024).toFixed(2)} KB / ${storageTotalMB} MB`
      : `${(used / oneMB).toFixed(2)} MB / ${storageTotalMB} MB`;
  };

  // Fetch a domain and return it.
  const fetchDomain = async (): Promise<string> => {
    try {
      const res = await fetch("https://api.mail.tm/domains");
      if (!res.ok) throw new Error(`Error fetching domain. Status: ${res.status}`);
      const data = await res.json();
      if (data["hydra:member"]?.length > 0) {
        const firstDomain = data["hydra:member"][0].domain;
        setDomain(firstDomain);
        console.log("Fetched domain =>", firstDomain);
        return firstDomain;
      }
      return "";
    } catch (err) {
      console.error("Error fetching domain:", err);
      return "";
    }
  };

  // Generate a random account (used when no credentials exist)
  const generateRandomEmail = async () => {
    try {
      localStorage.removeItem("tempEmail");
      localStorage.removeItem("tempPassword");
      localStorage.removeItem("tempToken");
      localStorage.removeItem("tempAccountId");

      const currentDomain = domain || (await fetchDomain());
      if (!currentDomain) {
        console.error("No valid domain found. Can't generate email.");
        return;
      }

      const localPart = `user${Math.floor(Math.random() * 100000)}`;
      const randomEmail = `${localPart}@${currentDomain}`;
      const randomPassword = generateRandomString(10);
      console.log("Generating random email =>", randomEmail);
      toast.info("Random account generated");

      const createRes = await fetch("https://api.mail.tm/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: randomEmail, password: randomPassword }),
      });
      if (!createRes.ok) {
        throw new Error("Error creating mail.tm account. Status " + createRes.status);
      }
      const accountData = await createRes.json();
      setAccountId(accountData.id);
      localStorage.setItem("tempAccountId", accountData.id);

      const tokenRes = await fetch("https://api.mail.tm/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: randomEmail, password: randomPassword }),
      });
      if (!tokenRes.ok) {
        throw new Error("Error generating mail.tm token. Status " + tokenRes.status);
      }
      const tokenData = await tokenRes.json();

      setEmail(randomEmail);
      setPassword(randomPassword);
      setToken(tokenData.token);
      setStorageUsed(0);
      localStorage.setItem("tempEmail", randomEmail);
      localStorage.setItem("tempPassword", randomPassword);
      localStorage.setItem("tempToken", tokenData.token);

      fetchMessages(tokenData.token);
      fetchStorageUsage(tokenData.token);
      toast.success("Account created and logged in successfully");
    } catch (err: any) {
      console.error("Error generating random email:", err);
      toast.error("Error generating random account: " + err.message);
    }
  };

  // createAccount: If the account exists and the password is correct, log in.
  // If it exists but the password is incorrect, show "Invalid credentials".
  // Otherwise, create the account and log in.
  const createAccount = async (username: string, customPassword: string) => {
    try {
      if (!domain) await fetchDomain();
      const emailToCheck = `${username}@${domain}`;
      // Try logging in
      const loginRes = await fetch("https://api.mail.tm/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: emailToCheck, password: customPassword }),
      });
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        localStorage.setItem("tempEmail", emailToCheck);
        localStorage.setItem("tempPassword", customPassword);
        localStorage.setItem("tempToken", loginData.token);
        setEmail(emailToCheck);
        setPassword(customPassword);
        setToken(loginData.token);
        fetchMessages(loginData.token);
        fetchStorageUsage(loginData.token);
        toast.success("Logged in successfully");
      } else if (loginRes.status === 401) {
        toast.error("Invalid credentials");
      } else {
        // Account does not exist — create it.
        const createRes = await fetch("https://api.mail.tm/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: emailToCheck, password: customPassword }),
        });
        if (!createRes.ok) {
          throw new Error("Error creating account, status: " + createRes.status);
        }
        toast.success("Account created successfully");
        // Log in after creation.
        const tokenRes = await fetch("https://api.mail.tm/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: emailToCheck, password: customPassword }),
        });
        if (!tokenRes.ok) {
          throw new Error("Error generating token, status: " + tokenRes.status);
        }
        const tokenData = await tokenRes.json();
        localStorage.setItem("tempEmail", emailToCheck);
        localStorage.setItem("tempPassword", customPassword);
        localStorage.setItem("tempToken", tokenData.token);
        setEmail(emailToCheck);
        setPassword(customPassword);
        setToken(tokenData.token);
        fetchMessages(tokenData.token);
        fetchStorageUsage(tokenData.token);
        toast.success("Logged in successfully");
      }
    } catch (error: any) {
      console.error("Error in createAccount:", error);
      toast.error("Error creating account: " + error.message);
    }
  };

  // Fetch messages from mail.tm
  const fetchMessages = async (authToken: string) => {
    try {
      const res = await fetch("https://api.mail.tm/messages", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Error fetching messages. Status: ${res.status}`);
      const data = await res.json();
      setMessages(data["hydra:member"] || []);
    } catch (err: any) {
      console.error("Error fetching messages:", err);
      toast.error("Error fetching messages: " + err.message);
    }
  };

  // Fetch full message details
  const fetchFullMessage = async (messageId: string) => {
    try {
      const res = await fetch(`https://api.mail.tm/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error fetching full message. Status: ${res.status}`);
      const data = await res.json();
      setFullMessage(data);
    } catch (err: any) {
      console.error("Error fetching full message:", err);
      toast.error("Error fetching email: " + err.message);
    }
  };

  const handleSelectMessage = (msg: EmailMessage) => {
    setSelectedMessage(msg);
    fetchFullMessage(msg.id);
  };

  // Fetch storage usage
  const fetchStorageUsage = async (authToken: string) => {
    try {
      console.log("Fetching storage usage with token:", authToken);
      const res = await fetch("https://api.mail.tm/me", {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: "application/ld+json",
        },
      });
      if (!res.ok) {
        console.error("Storage usage response status:", res.status);
        if (res.status === 401) {
          toast.error("Session expired. Please log in again.");
          localStorage.removeItem("tempEmail");
          localStorage.removeItem("tempPassword");
          localStorage.removeItem("tempToken");
          localStorage.removeItem("tempAccountId");
          setEmail("");
          setPassword("");
          setToken("");
          setAccountId("");
        }
        throw new Error(`Error fetching storage usage. Status: ${res.status}`);
      }
      const data = await res.json();
      if (data?.used !== undefined) {
        setStorageUsed(data.used);
        console.log("Account storage usage:", data);
      }
    } catch (err: any) {
      console.error("Error fetching storage usage:", err);
      toast.error("Error fetching storage usage: " + err.message);
    }
  };

  // SSE: Listen for Mercure events and show notifications.
  useEffect(() => {
    if (accountId && token) {
      const mercureUrl = `https://mercure.mail.tm/.well-known/mercure?topic=/accounts/${accountId}`;
      const es = new EventSourcePolyfill(mercureUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      es.onmessage = (event: MessageEvent) => {
        try {
          const eventData = JSON.parse(event.data);
          const subject = eventData.subject || "New Email Received";
          const preview = eventData.preview || "You have a new email update.";
          console.log("Mercure event received:", eventData);
          if (Notification.permission === "granted") {
            new Notification(subject, { body: preview });
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then((permission: string) => {
              if (permission === "granted") {
                new Notification(subject, { body: preview });
              }
            });
          }
        } catch (e: any) {
          console.error("Error parsing Mercure event data:", e);
        }
      };
      es.onerror = (err: any) => {
        console.error("Error with Mercure SSE:", err);
      };
      return () => {
        es.close();
      };
    }
  }, [accountId, token]);

  // Copy email to clipboard
  const handleCopy = () => {
    if (!email) return;
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      toast.success("Email copied!");
      setTimeout(() => setCopied(false), 1000);
    });
  };

  // Initialization: on mount, if saved credentials exist, use them; otherwise, generate a random account.
  useEffect(() => {
    (async () => {
      await fetchDomain();
      const savedEmail = localStorage.getItem("tempEmail");
      const savedPassword = localStorage.getItem("tempPassword");
      const savedToken = localStorage.getItem("tempToken");
      const savedAccountId = localStorage.getItem("tempAccountId");
      if (savedEmail && savedPassword && savedToken && savedAccountId) {
        console.log("Using existing localStorage creds =>", savedEmail);
        setEmail(savedEmail);
        setPassword(savedPassword);
        setToken(savedToken);
        setAccountId(savedAccountId);
        fetchMessages(savedToken);
        fetchStorageUsage(savedToken);
      } else {
        await generateRandomEmail();
      }
    })();
  }, []);

  // Polling: fetch messages and storage usage every 10 seconds.
  useEffect(() => {
    const interval = setInterval(() => {
      if (token) {
        fetchMessages(token);
        fetchStorageUsage(token);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // Conditional UI: When a message is selected, show full email view that fills the screen.
  return (
    <div>
      <ToastContainer />
      <Navbar
        email={email}
        copied={copied}
        handleCopy={handleCopy}
        generateRandomEmail={generateRandomEmail}
        getInitials={getInitials}
        formatStorage={formatStorage}
        password={password}
        storageUsed={storageUsed}
        storageTotalMB={storageTotalMB}
        createAccount={createAccount}
        domain={domain}
      />
      {selectedMessage && fullMessage ? (
        // Full Email View: fills the screen with no shadow or extra background styling.
        <div className="flex flex-col h-[100dvh] bg-white">
          <div className="px-6 py-4">
            <button
              onClick={() => {
                setSelectedMessage(null);
                setFullMessage(null);
              }}
              className="flex items-center focus:outline-none"
            >
              <FiArrowLeft size={24} className="text-gray-600" />
              <span className="ml-2 text-gray-600">Back</span>
            </button>
          </div>
          <div className="flex-grow px-6 pb-6 overflow-auto">
            <h4 className="text-2xl font-light text-gray-800 mb-4">
              {selectedMessage.subject}
            </h4>
            <p className="text-sm text-gray-600 mb-2">
              From: {selectedMessage.from.address}
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Received: {new Date(selectedMessage.createdAt).toLocaleString()}
            </p>
            <div
              className="border-t pt-4 text-gray-700"
              dangerouslySetInnerHTML={{
                __html: fullMessage.html || fullMessage.text || "",
              }}
            />
          </div>
        </div>
      ) : (
        // Inbox List View
        <div className="p-8 bg-white min-h-[100dvh]">
          <h3 className="text-2xl font-light text-gray-800 mb-6">Inbox</h3>
          <div className="bg-white shadow rounded-xl overflow-hidden">
            {messages.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">No messages yet.</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => {
                    setSelectedMessage(msg);
                    fetchFullMessage(msg.id);
                  }}
                  className="cursor-pointer px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <p className="text-lg font-light text-gray-800">{msg.subject}</p>
                  <p className="text-sm text-gray-600 mt-1">From: {msg.from.address}</p>
                  <p className="text-xs text-gray-500 mt-1">{msg.intro}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(msg.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
