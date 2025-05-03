export function extractGitHubPRInfo(url) {
    const withoutPrefix = url.replace("https://github.com/", "");
    const parts = withoutPrefix.split("/");
    if (parts.length < 4) {
        throw new Error("Invalid GitHub PR URL format");
    }
    return {
        owner: parts[0],
        repo: parts[1],
        pull_number: parts[3],
    };
}
//# sourceMappingURL=extractGitHubPRInfo.js.map