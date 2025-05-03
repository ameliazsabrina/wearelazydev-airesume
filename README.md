# GitHub PR Resume Builder: Frontend Guide

This guide will help you connect your Next.js TypeScript frontend to our GitHub PR Resume Builder API. This API lets users verify their GitHub PRs and generate a professional resume from them.

## What You'll Need

Create a `.env.local` file with these variables:

```
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
NEXT_PUBLIC_API_URL=http://localhost:3000 # or deployed API URL
NEXT_PUBLIC_REDIRECT_URL=http://localhost:3000/auth/callback # must match GitHub OAuth setting
```

## Step 1: GitHub Login

### Create an Auth Button

```tsx
// app/login/page.tsx
"use client";
import { startGitHubLogin } from "@/utils/auth";

export default function LoginPage() {
  return (
    <div className="flex justify-center items-center h-screen">
      <button
        onClick={startGitHubLogin}
        className="bg-black text-white px-6 py-3 rounded-md flex items-center gap-2"
      >
        <GithubIcon size={24} /> {/* Import from your preferred icon library */}
        Sign in with GitHub
      </button>
    </div>
  );
}
```

### Handle the GitHub Redirect

```tsx
// utils/auth.ts
export function startGitHubLogin() {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID!;
  const redirectUri = encodeURIComponent(process.env.NEXT_PUBLIC_REDIRECT_URL!);

  window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo&redirect_uri=${redirectUri}`;
}

// Store token in secure cookie or React state management
export function saveToken(token: string) {
  // For development, you can use localStorage, but for production:
  // - Use httpOnly cookies (server-side)
  // - Or a secure state management solution
  localStorage.setItem("github_token", token);
}

export function getToken(): string | null {
  return localStorage.getItem("github_token");
}
```

### Create the Callback Page

```tsx
// app/auth/callback/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveToken } from "@/utils/auth";

export default function AuthCallback() {
  const [status, setStatus] = useState<"loading" | "error" | "success">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      // Get the code from URL
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");

      if (error) {
        setStatus("error");
        setErrorMessage(
          params.get("error_description") || "GitHub login failed"
        );
        return;
      }

      if (!code) {
        setStatus("error");
        setErrorMessage("No authorization code received");
        return;
      }

      try {
        // Exchange code for token
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/getAccessToken?code=${code}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || response.statusText);
        }

        const data = await response.json();
        if (!data.access_token) {
          throw new Error("No access token received");
        }

        // Save the token
        saveToken(data.access_token);
        setStatus("success");

        // Redirect to dashboard
        router.push("/dashboard");
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message || "Failed to get access token");
      }
    }

    handleCallback();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      {status === "loading" && <p>Logging you in...</p>}
      {status === "error" && (
        <p className="text-red-500">Error: {errorMessage}</p>
      )}
      {status === "success" && <p>Login successful! Redirecting...</p>}
    </div>
  );
}
```

## Step 2: API Service for GitHub PR Functions

Create an API service file to handle all backend communication:

```tsx
// utils/api.ts
import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

// Check if user is logged in
export function isLoggedIn(): boolean {
  return !!getToken();
}

// Basic API request with auth header
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || response.statusText);
  }

  return response;
}

// 1. Verify a GitHub PR
export async function verifyPR(prUrl: string) {
  const encodedUrl = encodeURIComponent(prUrl);
  const response = await apiRequest(`/generate-proof?url=${encodedUrl}`);
  return response.json();
}

// 2. Get user's verified PRs
export async function getVerifiedPRs() {
  const response = await apiRequest("/verified-prs");
  return response.json();
}

// 3. Generate resume data
export async function generateResumeData() {
  const response = await apiRequest("/generate-resume");
  return response.json();
}

// 4. Download resume PDF
export async function downloadResumePDF() {
  const response = await apiRequest("/download-resume");
  const blob = await response.blob();

  // Get filename from header or use default
  const contentDisposition = response.headers.get("content-disposition");
  let filename = "resume.pdf";
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^;"]+)"?/i);
    if (match && match[1]) filename = match[1];
  }

  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
```

## Step 3: Create the Dashboard

```tsx
// app/dashboard/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  isLoggedIn,
  getVerifiedPRs,
  verifyPR,
  generateResumeData,
  downloadResumePDF,
} from "@/utils/api";

interface PR {
  id: string;
  url: string;
  title: string;
  repository: string;
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [prs, setPrs] = useState<PR[]>([]);
  const [prUrl, setPrUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if user is logged in
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }

    // Load verified PRs
    loadVerifiedPRs();
  }, [router]);

  async function loadVerifiedPRs() {
    setLoading(true);
    try {
      const data = await getVerifiedPRs();
      setPrs(data.verifiedPRs || []);
    } catch (err: any) {
      setError(err.message || "Failed to load PRs");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyPR(e: React.FormEvent) {
    e.preventDefault();
    if (!prUrl.trim()) return;

    setVerifyLoading(true);
    setError("");

    try {
      const result = await verifyPR(prUrl);
      if (result.isMerged) {
        setPrUrl("");
        await loadVerifiedPRs(); // Refresh the list
      } else {
        setError(
          "PR could not be verified. Make sure it's a valid, merged PR."
        );
      }
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleGenerateResume() {
    try {
      setLoading(true);
      await generateResumeData();
      await downloadResumePDF();
    } catch (err: any) {
      setError(err.message || "Failed to generate resume");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">GitHub PR Resume Builder</h1>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-4">
          {error}
        </div>
      )}

      <div className="bg-gray-100 p-4 rounded-md mb-6">
        <h2 className="text-lg font-semibold mb-2">Verify a GitHub PR</h2>
        <form onSubmit={handleVerifyPR} className="flex gap-2">
          <input
            type="text"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            placeholder="Paste GitHub PR URL here"
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <button
            type="submit"
            disabled={verifyLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded-md disabled:bg-blue-300"
          >
            {verifyLoading ? "Verifying..." : "Verify PR"}
          </button>
        </form>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Your Verified PRs</h2>
          <button
            onClick={handleGenerateResume}
            disabled={loading || prs.length === 0}
            className="bg-green-500 text-white px-4 py-2 rounded-md disabled:bg-green-300"
          >
            Generate Resume PDF
          </button>
        </div>

        {loading ? (
          <p>Loading PRs...</p>
        ) : prs.length === 0 ? (
          <p>No verified PRs yet. Add one above to get started!</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {prs.map((pr) => (
              <li key={pr.id} className="py-3">
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {pr.repository}: {pr.title}
                </a>
                <p className="text-sm text-gray-500">
                  Added on {new Date(pr.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```
