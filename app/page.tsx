'use client';

import { useState, useEffect } from 'react';
import { LuMail } from "react-icons/lu";
import { FaRegCircleCheck } from "react-icons/fa6";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FiUser } from "react-icons/fi";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";

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
}

export default function TempMail() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [fullMessage, setFullMessage] = useState<FullEmailMessage | null>(null);
  const [copied, setCopied] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);
  const [username, setUsername] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [domain, setDomain] = useState('');

  const storageTotalMB = 40;

  const handleCopy = () => {
    if (!email) return;
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    });
  };

  const getInitials = (rawEmail: string) => (rawEmail ? rawEmail[0].toUpperCase() : '?');

  // Generate new temp email
  const generateNewEmail = async () => {
    try {
      const res = await fetch('/api/temp-email', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      setEmail(data.email || '');
      setPassword(data.password || '');
      setToken(data.token || '');
      localStorage.setItem('tempEmail', data.email);
      localStorage.setItem('tempPassword', data.password);
      localStorage.setItem('tempToken', data.token);
    } catch (err) {
      console.error('Error generating temp email:', err);
    }
  };

  // Fetch messages
  const fetchMessages = async (authToken: string) => {
    try {
      const res = await fetch('/api/messages', {
        headers: { Authorization: authToken }
      });
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      setMessages(data['hydra:member'] || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  // Fetch full message
  const fetchFullMessage = async (messageId: string) => {
    try {
      const res = await fetch(`https://api.mail.tm/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      setFullMessage(data);
    } catch (err) {
      console.error('Error fetching full message:', err);
    }
  };

  const handleSelectMessage = (msg: EmailMessage) => {
    setSelectedMessage(msg);
    fetchFullMessage(msg.id);
  };

  // Fetch domain
  const fetchDomain = async () => {
    try {
      const res = await fetch('https://api.mail.tm/domains');
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      if (data["hydra:member"]?.length > 0) {
        setDomain(data["hydra:member"][0].domain);
      }
    } catch (err) {
      console.error('Error fetching domain:', err);
    }
  };

  // Fetch email details
  const fetchEmailDetails = async () => {
    try {
      const res = await fetch('/api/temp-email');
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      if (data.email && data.token) {
        setEmail(data.email);
        setPassword(data.password || '');
        setToken(data.token);
        setStorageUsed(data.used || 0);
      }
    } catch (err) {
      console.error('Error fetching email details:', err);
    }
  };

  // Fetch storage usage
  const fetchStorageUsage = async (authToken: string) => {
    try {
      const res = await fetch('https://api.mail.tm/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      if (data?.used !== undefined) setStorageUsed(data.used);
    } catch (err) {
      console.error('Error fetching storage usage:', err);
    }
  };

  // Check if account exists
  const checkAccountExists = async (accEmail: string, accPassword: string) => {
    try {
      const res = await fetch('https://api.mail.tm/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: accEmail, password: accPassword })
      });
      const data = await res.json();
      return (res.ok && data.token) ? data.token : null;
    } catch (err) {
      console.error('Error checking account existence:', err);
      return null;
    }
  };

  // Create new account
  const createAccount = async () => {
    if (!username || !customPassword) {
      alert("Please enter a username and password.");
      return;
    }
    const newEmail = `${username}@${domain}`;
    const existingToken = await checkAccountExists(newEmail, customPassword);
    if (existingToken) {
      setEmail(newEmail);
      setPassword(customPassword);
      setToken(existingToken);
      localStorage.setItem('tempEmail', newEmail);
      localStorage.setItem('tempPassword', customPassword);
      localStorage.setItem('tempToken', existingToken);
      return;
    }
    try {
      const res = await fetch('/api/temp-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: customPassword })
      });
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      setEmail(newEmail);
      setPassword(customPassword);
      setToken(data.token);
      setStorageUsed(0);
      localStorage.setItem('tempEmail', newEmail);
      localStorage.setItem('tempPassword', customPassword);
      localStorage.setItem('tempToken', data.token);
    } catch (err) {
      console.error('Error creating account:', err);
    }
  };

  const formatStorage = (used: number) =>
    used < 1024
      ? `${used} KB / ${storageTotalMB} MB`
      : `${(used / 1024).toFixed(2)} MB / ${storageTotalMB} MB`;

  // Initial data fetching
  useEffect(() => {
    const savedEmail = localStorage.getItem('tempEmail');
    const savedPassword = localStorage.getItem('tempPassword');
    const savedToken = localStorage.getItem('tempToken');
    if (savedEmail && savedToken) {
      setEmail(savedEmail);
      setPassword(savedPassword || '');
      setToken(savedToken);
      fetchMessages(savedToken);
      fetchStorageUsage(savedToken);
    } else {
      generateNewEmail();
    }

    const messageInterval = setInterval(() => {
      if (token) fetchMessages(token);
    }, 5000);

    return () => clearInterval(messageInterval);
  }, [token]);

  useEffect(() => {
    fetchEmailDetails();
    fetchDomain();
  }, []);

  return (
    <>
      <div className='flex flex-row px-9 py-6 border-b-2 border-b-[#f6f5f7] justify-between items-center'>
        {/* Copy Email */}
        <button
          onClick={handleCopy}
          className='bg-[#f5f7fa] py-2 px-4 rounded-md flex items-center gap-2 group duration-500 hover:bg-black'
        >
          <div
            className={`transition-transform duration-300 ${
              copied ? 'scale-125 opacity-0' : 'scale-100 opacity-100'
            }`}
          >
            <LuMail size={15} className='text-[#929292] group-hover:text-white' />
          </div>
          <div
            className={`absolute transition-transform duration-300 ${
              copied ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            }`}
          >
            <FaRegCircleCheck size={15} className='text-green-500' />
          </div>
          <p className='text-[#929292] group-hover:text-white'>
            {email || "No email generated yet"}
          </p>
        </button>

        {/* User Avatar and Info */}
        <Popover>
          <PopoverTrigger>
            <Avatar>
              <AvatarFallback className='select-none cursor-pointer'>
                {getInitials(email)}
              </AvatarFallback>
            </Avatar>
          </PopoverTrigger>
          <PopoverContent className='flex flex-col space-y-3'>
            {/* Email + Password */}
            <div className='flex gap-3 items-center p-1'>
              <Avatar>
                <AvatarFallback>{getInitials(email)}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className='font-semibold text-sm'>{email || "No email yet"}</h1>
                <p className='text-xs text-[#7e7e7e]'>{password || "No password yet"}</p>
              </div>
            </div>
            <hr />
            {/* Storage Usage */}
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-500">{formatStorage(storageUsed)}</p>
              <Progress value={(storageUsed / (storageTotalMB * 1024)) * 100} />
            </div>
            <hr />
            {/* Create New Account */}
            <Dialog>
              <DialogTrigger>
                <div className='flex items-center gap-2 font-semibold transition-all hover:text-[#646464]'>
                  <FiUser />
                  <p className='text-sm'>Create New Account</p>
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create an account</DialogTitle>
                  <DialogDescription>
                    Select a username, domain, and password.
                  </DialogDescription>
                </DialogHeader>
                <p>Email:</p>
                <div className='flex items-center'>
                  <Input
                    type="text"
                    placeholder="johnsmith"
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
                <div className='flex items-center gap-3 mt-4'>
                  <Button variant="secondary" className='w-full'>Cancel</Button>
                  <Button variant="default" className='w-full' onClick={createAccount}>
                    Create
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </PopoverContent>
        </Popover>
      </div>

      {/* Inbox Messages */}
      <div className="p-6">
        <h3 className="text-lg font-semibold">Inbox</h3>
        <div className="mt-2 border p-2 rounded bg-gray-100 max-h-64 overflow-auto">
          {messages.length === 0 ? (
            <p>No messages yet.</p>
          ) : (
            messages.map((msg) => (
              <Dialog key={msg.id}>
                <DialogTrigger asChild>
                  <div
                    onClick={() => handleSelectMessage(msg)}
                    className="cursor-pointer p-2 border-b hover:bg-gray-200"
                  >
                    <p><strong>{msg.subject}</strong></p>
                    <p className="text-sm text-gray-600">From: {msg.from.address}</p>
                    <p className="text-xs text-gray-500">{msg.intro}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                </DialogTrigger>

                {/* Full Email View */}
                <DialogContent className="w-full max-w-4xl">
                  <DialogTitle>{selectedMessage?.subject || "Email Details"}</DialogTitle>
                  {selectedMessage && fullMessage ? (
                    <>
                      <p><strong>From:</strong> {selectedMessage.from.address}</p>
                      <p><strong>Received:</strong> {new Date(selectedMessage.createdAt).toLocaleString()}</p>
                      <div className="mt-4 border-t pt-2 max-h-[70dvh] overflow-auto">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: fullMessage.html || fullMessage.text || ''
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <p>Loading...</p>
                  )}
                </DialogContent>
              </Dialog>
            ))
          )}
        </div>
      </div>
    </>
  );
}
