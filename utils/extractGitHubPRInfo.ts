interface GitHubPRInfo {
  owner: string;
  repo: string;
  pull_number: string;
}

export function extractGitHubPRInfo(url: string): GitHubPRInfo {
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
