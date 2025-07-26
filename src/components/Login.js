"use client";
import React, { useState } from "react";

export default function Login({ onVerified }) {
  const [step, setStep] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await res.json();
    
    if (data.error) {
      setError(data.error);
    } else if (data.needsVerification) {
      // Send verification code and switch to verify step
      await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      setStep("verify");
    } else if (data.authenticated && data.token) {
      const token = data.token.trim();
      sessionStorage.setItem('authToken', token);
      onVerified({ email: data.email, userId: data.userId });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    
    if (res.ok) {
      setStep("verify");
    } else {
      const data = await res.json();
      setError(data.error || "Registration failed");
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (data.verified) {
      onVerified({ email });
    } else {
      setError(data.error || "Invalid code");
    }
  };

  if (step === "login") {
    return (
      <form onSubmit={handleLogin} className="max-w-sm mx-auto p-6 bg-white rounded-xl shadow-md mt-10">
        <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
        {error && <div className="mb-2 text-red-600">{error}</div>}
        <div className="mb-4">
          <label className="block mb-1">Email</label>
          <input
            type="email"
            className="w-full border border-gray-300 rounded p-2"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Password</label>
          <input
            type="password"
            className="w-full border border-gray-300 rounded p-2"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-2"
        >
          Login
        </button>
        <button
          type="button"
          onClick={handleRegister}
          className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Register
        </button>
      </form>
    );
  }

  // Verification step
  return (
    <form onSubmit={handleVerify} className="max-w-sm mx-auto p-6 bg-white rounded-xl shadow-md mt-10">
      <h2 className="text-2xl font-bold mb-4 text-center">Verify Email</h2>
      {error && <div className="mb-2 text-red-600">{error}</div>}
      <div className="mb-4">
        <label className="block mb-1">Verification Code</label>
        <input
          type="text"
          className="w-full border border-gray-300 rounded p-2"
          value={code}
          onChange={e => setCode(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Verify
      </button>
    </form>
  );
}