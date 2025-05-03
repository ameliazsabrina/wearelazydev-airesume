import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import { ReclaimClient } from "@reclaimprotocol/zk-fetch";
import { transformForOnchain, verifyProof } from "@reclaimprotocol/js-sdk";
import { generatePDFFromResume } from "./utils/pdfGenerator.js";
import { dbUtils } from "./utils/database.js";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import os from "os";
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
import bodyParser from "body-parser";
import { extractGitHubPRInfo } from "./utils/extractGitHubPRInfo.js";
import { fetchDetailedPRData, generateCompleteResume, } from "./utils/resumeGenerator.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const RECLAIM_ID = process.env.RECLAIM_ID;
const RECLAIM_SECRET = process.env.RECLAIM_SECRET;
if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    console.error("Missing GitHub credentials");
    process.exit(1);
}
if (!RECLAIM_ID || !RECLAIM_SECRET) {
    console.error("Missing Reclaim credentials");
    process.exit(1);
}
const PORT = parseInt(process.env.PORT || "3000", 10);
const app = express();
app.use(cors({
    origin: ["http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(bodyParser.json());
app.use(express.json());
app.get("/getAccessToken", async (req, res) => {
    const code = req.query.code;
    if (!code) {
        res.status(400).json({ error: "No code provided" });
        return;
    }
    try {
        const response = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code: code,
            }),
        });
        const data = await response.json();
        if (data.error) {
            res.status(400).json({ error: data.error_description });
            return;
        }
        res.status(200).json(data);
    }
    catch (error) {
        console.error("Error getting access token:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
app.get("/generate-proof", async (req, res) => {
    try {
        const client = new ReclaimClient(RECLAIM_ID, RECLAIM_SECRET, true);
        const urlPullRequest = req.query.url;
        if (!urlPullRequest) {
            res.status(400).json({ message: "Missing PR URL" });
            return;
        }
        const { owner, repo, pull_number } = extractGitHubPRInfo(urlPullRequest);
        const publicOptions = {
            method: "GET",
            headers: {
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "Content-Type": "application/json",
            },
        };
        const authorizationHeader = req.get("Authorization");
        if (!authorizationHeader) {
            res.status(401).json({ message: "Authorization header required" });
            return;
        }
        const privateOptions = {
            headers: {
                Authorization: authorizationHeader,
            },
        };
        const userUrl = "https://api.github.com/user";
        const prUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}`;
        const prProof = await client
            .zkFetch(prUrl, { ...publicOptions }, {
            ...privateOptions,
            responseMatches: [
                { type: "regex", value: 'merged":(?<merged>true|false)' },
                {
                    type: "regex",
                    value: '"user":\\s*{\\s*"login":\\s*"(?<login>[^"]+)",\\s*"id":\\s*(?<id>\\d+),\\s*"node_id":\\s*"(?<node_id>[^"]+)"',
                },
            ],
        })
            .catch((error) => {
            console.error(`Error fetching PR data from ${prUrl}:`, error);
            return null; // Return null to indicate failure
        });
        const userProof = await client
            .zkFetch(userUrl, { ...publicOptions }, {
            ...privateOptions,
            responseMatches: [
                {
                    type: "regex",
                    value: '"login":\\s*"(?<login>[^"]+)",\\s*"id":\\s*(?<id>\\d+),\\s*"node_id":\\s*"(?<node_id>[^"]+)"',
                },
            ],
        })
            .catch((error) => {
            console.error(`Error fetching User data from ${userUrl}:`, error);
            return null;
        });
        if (!prProof || !userProof) {
            res
                .status(500)
                .json({ message: "Failed to generate proof (fetch stage)" });
            return;
        }
        const isPrProofVerified = await verifyProof(prProof);
        const isUserProofVerified = await verifyProof(userProof);
        if (!isPrProofVerified || !isUserProofVerified) {
            res
                .status(500)
                .json({ message: "Failed to verify pull request or user proof" });
            return;
        }
        const prProofData = transformForOnchain(prProof);
        const userProofData = transformForOnchain(userProof);
        const prContext = JSON.parse(prProofData.claimInfo.context);
        const mergedStatus = prContext.extractedParameters?.merged === "true";
        if (mergedStatus) {
            const userContext = JSON.parse(userProofData.claimInfo.context);
            const userId = userContext.extractedParameters?.id;
            if (userId) {
                dbUtils.addVerifiedPR(userId, owner, repo, pull_number);
            }
        }
        res.status(200).json({
            prProofData,
            userProofData,
            isMerged: mergedStatus,
        });
    }
    catch (error) {
        console.error("Error in /generate-proof:", error);
        res.status(500).json({ error: error.message });
    }
});
app.get("/generate-resume", async (req, res) => {
    try {
        const authToken = req.get("Authorization");
        if (!authToken) {
            res.status(401).json({ message: "Authorization token required" });
            return;
        }
        const userResponse = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: authToken,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });
        if (!userResponse.ok) {
            res.status(401).json({ message: "Invalid GitHub token" });
            return;
        }
        const userData = await userResponse.json();
        const userId = userData.id.toString();
        if (dbUtils.getVerifiedPRCount(userId) === 0) {
            res.status(404).json({
                message: "No verified merged PRs found for this user. Please verify some PRs first.",
            });
            return;
        }
        const verifiedPRs = dbUtils.getVerifiedPRs(userId);
        const prDetailedDataPromises = verifiedPRs.map((pr) => fetchDetailedPRData(pr.owner, pr.repo, pr.pull_number, authToken));
        const prsDetailedData = await Promise.all(prDetailedDataPromises);
        const resumeData = await generateCompleteResume(prsDetailedData, userData);
        res.status(200).json({
            message: "Resume generated successfully",
            resumeData,
            verifiedPRs: verifiedPRs.length,
        });
    }
    catch (error) {
        console.error("Resume generation error:", error);
        res.status(500).json({ error: error.message });
    }
});
app.get("/verified-prs", async (req, res) => {
    try {
        const authToken = req.get("Authorization");
        if (!authToken) {
            res.status(401).json({ message: "Authorization token required" });
            return;
        }
        const userResponse = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: authToken,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });
        if (!userResponse.ok) {
            res.status(401).json({ message: "Invalid GitHub token" });
            return;
        }
        const userData = await userResponse.json();
        const userId = userData.id.toString();
        const verifiedPRs = dbUtils.getVerifiedPRs(userId);
        const count = dbUtils.getVerifiedPRCount(userId);
        res.status(200).json({
            verifiedPRs,
            count,
        });
    }
    catch (error) {
        console.error("Error fetching verified PRs:", error);
        res.status(500).json({ error: error.message });
    }
});
app.get("/download-resume", async (req, res) => {
    let outputFileName = null; // Keep track for potential fallback
    try {
        const authToken = req.get("Authorization");
        if (!authToken) {
            res.status(401).json({ message: "Authorization token required" });
            return;
        }
        const userResponse = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: authToken,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });
        if (!userResponse.ok) {
            res.status(401).json({ message: "Invalid GitHub token" });
            return;
        }
        const userData = await userResponse.json();
        const userId = userData.id.toString();
        const userLogin = userData.login;
        if (dbUtils.getVerifiedPRCount(userId) === 0) {
            res.status(404).json({
                message: "No verified merged PRs found for this user. Please verify some PRs first.",
            });
            return;
        }
        const verifiedPRs = dbUtils.getVerifiedPRs(userId);
        const prDetailedDataPromises = verifiedPRs.map((pr) => fetchDetailedPRData(pr.owner, pr.repo, pr.pull_number, authToken));
        const prsDetailedData = await Promise.all(prDetailedDataPromises);
        const resumeData = await generateCompleteResume(prsDetailedData, userData);
        const homeDir = os.homedir();
        const downloadsPath = path.join(homeDir, "Downloads");
        outputFileName = path.join(downloadsPath, `wearelazydev_resume_${userLogin}.pdf`);
        try {
            await fs.access(downloadsPath);
        }
        catch {
            console.warn(`Downloads directory (${downloadsPath}) not found or accessible. Saving to project root instead.`);
            outputFileName = `wearelazydev_resume_${userLogin}.pdf`;
        }
        const pdfBuffer = await generatePDFFromResume({ resumeText: resumeData.resumeText }, outputFileName);
        if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new Error("Generated PDF buffer is empty or save failed.");
        }
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=${userLogin}_resume.pdf`);
        res.setHeader("Content-Length", pdfBuffer.length);
        res.send(pdfBuffer);
        console.log(`Successfully sent PDF resume for user: ${userLogin}`);
    }
    catch (error) {
        console.error("Error in download-resume endpoint:", error);
        res.status(500).json({ error: error.message });
    }
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map