'use client';

import { useState, useEffect } from 'react';

export default function TempMail() {
    const [email, setEmail] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const [error, setError] = useState(null);
    const [messages, setMessages] = useState([]);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [fullMessage, setFullMessage] = useState(null);
    const [token, setToken] = useState(null);

    useEffect(() => {
        const savedEmail = localStorage.getItem('tempEmail');
        const savedToken = localStorage.getItem('tempToken');

        if (savedEmail && savedToken) {
            setEmail(savedEmail);
            setToken(savedToken);
            fetchMessages(savedToken);
        }

        updateCooldown();
        const interval = setInterval(updateCooldown, 1000);
        const messageInterval = setInterval(() => {
            if (token) {
                fetchMessages(token);
            }
        }, 5000);

        return () => {
            clearInterval(interval);
            clearInterval(messageInterval);
        };
    }, [token]);

    const updateCooldown = () => {
        const savedTime = localStorage.getItem('lastGenerated');
        if (!savedTime) return;
        const timePassed = Math.floor((Date.now() - Number(savedTime)) / 1000);
        const remaining = 600 - timePassed;
        setCooldown(remaining > 0 ? remaining : 0);
    };

    const generateNewEmail = async () => {
        if (cooldown > 0) return;

        try {
            const res = await fetch('/api/temp-email', { method: 'POST' });
            if (!res.ok) {
                throw new Error(`HTTP error! Status: ${res.status}`);
            }

            const data = await res.json();
            setEmail(data.email);
            setToken(data.token);
            localStorage.setItem('tempEmail', data.email);
            localStorage.setItem('tempToken', data.token);
            localStorage.setItem('lastGenerated', Date.now().toString());
            updateCooldown();
            fetchMessages(data.token);
        } catch (err) {
            console.error('Error generating temp email:', err);
            setError(err.message);
        }
    };

    const fetchMessages = async (authToken) => {
        try {
            const res = await fetch('/api/messages', {
                headers: { Authorization: authToken }
            });
            if (!res.ok) {
                throw new Error(`HTTP error! Status: ${res.status}`);
            }
            const data = await res.json();
            setMessages(data['hydra:member']);
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    };

    const fetchFullMessage = async (messageId) => {
        try {
            const res = await fetch(`https://api.mail.tm/messages/${messageId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) {
                throw new Error(`HTTP error! Status: ${res.status}`);
            }
            const data = await res.json();
            setFullMessage(data);
        } catch (err) {
            console.error('Error fetching full message:', err);
        }
    };

    const handleSelectMessage = (msg) => {
        setSelectedMessage(msg);
        fetchFullMessage(msg.id);
    };

    const handleDownloadAttachment = async (attachment) => {
        try {
            const res = await fetch(attachment.downloadUrl, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) {
                throw new Error(`HTTP error! Status: ${res.status}`);
            }
            
            const blob = await res.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = attachment.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Error downloading attachment:', err);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            return date.toLocaleTimeString();
        }
        return date.toLocaleDateString();
    };

    return (
        <div className="p-6">
            <h2 className="text-xl font-bold">Temporary Email</h2>
            {error && <p className="text-red-500">{error}</p>}

            <div className="mt-4">
                <p><strong>Email:</strong> {email || "No email generated yet"}</p>
            </div>

            <button
                onClick={generateNewEmail}
                disabled={cooldown > 0}
                className={`mt-4 px-4 py-2 rounded ${cooldown > 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white'}`}
            >
                {cooldown > 0 ? `Wait ${Math.floor(cooldown / 60)}m ${cooldown % 60}s` : "Generate New Email"}
            </button>

            <h3 className="text-lg font-semibold mt-6">Inbox</h3>
            <div className="mt-2 border p-2 rounded bg-gray-100 max-h-64 overflow-auto">
                {messages.length === 0 ? (
                    <p>No messages yet.</p>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            onClick={() => handleSelectMessage(msg)}
                            className="cursor-pointer p-2 border-b hover:bg-gray-200"
                        >
                            <p><strong>{msg.subject}</strong></p>
                            <p className="text-sm text-gray-600">From: {msg.from.address}</p>
                            <p className="text-xs text-gray-500">{msg.intro}</p>
                            <p className="text-xs text-gray-400">{formatDate(msg.createdAt)}</p>
                        </div>
                    ))
                )}
            </div>

            {selectedMessage && fullMessage && (
                <div className="mt-4 p-4 border rounded bg-white">
                    <h3 className="text-lg font-semibold">{selectedMessage.subject}</h3>
                    <p><strong>From:</strong> {selectedMessage.from.address}</p>
                    <p><strong>Received:</strong> {formatDate(selectedMessage.createdAt)}</p>
                    <div className="mt-2 border-t pt-2">
                        <div dangerouslySetInnerHTML={{ __html: fullMessage.html || fullMessage.text }} className="w-full h-[600px] border overflow-auto"></div>
                    </div>
                    {fullMessage.attachments && fullMessage.attachments.length > 0 && (
                        <div className="mt-4">
                            <h4 className="font-semibold">Attachments:</h4>
                            <ul>
                                {fullMessage.attachments.map((attachment) => (
                                    <li key={attachment.id}>
                                        <button onClick={() => handleDownloadAttachment(attachment)} className="text-blue-500 underline">
                                            {attachment.filename} ({attachment.contentType})
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
