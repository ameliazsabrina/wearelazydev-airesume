import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
if (!openai.apiKey) {
    console.error("Missing OpenAI API key");
    process.exit(1);
}
export async function fetchDetailedPRData(owner, repo, pull_number, authToken) {
    const headers = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        Authorization: authToken,
    };
    try {
        const [prResponse, commitsResponse, commentsResponse, reviewCommentsResponse, filesResponse,] = await Promise.all([
            fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}`, { headers }),
            fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}/commits`, { headers }),
            fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}/comments`, { headers }),
            fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}/reviews`, { headers }),
            fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}/files`, { headers }),
        ]);
        if (!prResponse.ok || !commitsResponse.ok || !filesResponse.ok) {
            let errorMsg = "Failed to fetch detailed PR data:";
            if (!prResponse.ok)
                errorMsg += ` PR Status ${prResponse.status};`;
            if (!commitsResponse.ok)
                errorMsg += ` Commits Status ${commitsResponse.status};`;
            if (!filesResponse.ok)
                errorMsg += ` Files Status ${filesResponse.status};`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        const prData = await prResponse.json();
        const commitsData = await commitsResponse.json();
        const commentsData = await commentsResponse.json(); // Type properly if needed
        const reviewCommentsData = await reviewCommentsResponse.json(); // Type properly if needed
        const filesData = await filesResponse.json();
        return {
            pr: prData,
            commits: commitsData,
            comments: commentsData,
            reviews: reviewCommentsData,
            files: filesData || [],
        };
    }
    catch (error) {
        console.error("Error fetching detailed PR data:", error);
        throw new Error(`Failed to fetch detailed PR data: ${error.message}`);
    }
}
function detectLanguages(files, pr) {
    const languages = new Set();
    const fileExtensions = {
        js: "JavaScript",
        jsx: "JavaScript",
        ts: "TypeScript",
        tsx: "TypeScript",
        py: "Python",
        java: "Java",
        kt: "Kotlin",
        swift: "Swift",
        go: "Go",
        rb: "Ruby",
        php: "PHP",
        cs: "C#",
        cpp: "C++",
        c: "C",
        h: "C/C++ Header",
        html: "HTML",
        css: "CSS",
        scss: "SCSS/Sass",
        sass: "SCSS/Sass",
        less: "LESS",
        sql: "SQL",
        sh: "Shell Script",
        rs: "Rust",
        dart: "Dart",
        scala: "Scala",
        m: "Objective-C",
        mm: "Objective-C++",
        vue: "Vue.js",
        svelte: "Svelte",
    };
    if (files && files.length > 0) {
        files.forEach((file) => {
            const extension = file.filename?.split(".").pop()?.toLowerCase();
            if (extension && fileExtensions[extension]) {
                languages.add(fileExtensions[extension]);
            }
        });
    }
    if (languages.size === 0 && pr) {
        const textToAnalyze = `${pr.title} ${pr.body || ""}`.toLowerCase();
        const languagePatterns = [
            { pattern: /javascript|js|node/g, name: "JavaScript" },
            { pattern: /typescript|ts/g, name: "TypeScript" },
            { pattern: /python|py|django|flask/g, name: "Python" },
            { pattern: /java|spring|maven/g, name: "Java" },
            { pattern: /c\+\+|cpp/g, name: "C++" },
            { pattern: /c#|csharp|\.net/g, name: "C#" },
            { pattern: /go|golang/g, name: "Go" },
            { pattern: /ruby|rails/g, name: "Ruby" },
            { pattern: /php|laravel|symfony/g, name: "PHP" },
        ];
        languagePatterns.forEach((lang) => {
            if (textToAnalyze.match(lang.pattern)) {
                languages.add(lang.name);
            }
        });
    }
    if (languages.has("SCSS/Sass")) {
        languages.delete("SCSS");
        languages.delete("Sass");
    }
    return languages.size > 0
        ? Array.from(languages).sort().join(", ")
        : "Undetermined";
}
function identifyFrameworks(files, pr, commits) {
    const frameworks = new Set();
    if (files && files.length > 0) {
        const filenames = files.map((f) => f.filename?.toLowerCase());
        if (filenames.includes("package.json"))
            frameworks.add("Node.js/NPM");
        if (filenames.includes("yarn.lock"))
            frameworks.add("Node.js/Yarn");
        if (filenames.includes("requirements.txt"))
            frameworks.add("Python/Pip");
        if (filenames.includes("pyproject.toml"))
            frameworks.add("Python/Poetry");
        if (filenames.includes("pom.xml"))
            frameworks.add("Java/Maven");
        if (filenames.includes("build.gradle"))
            frameworks.add("Java/Gradle");
        if (filenames.includes("composer.json"))
            frameworks.add("PHP/Composer");
        if (filenames.includes("gemfile") || filenames.includes("gemfile.lock"))
            frameworks.add("Ruby/Bundler");
        if (filenames.some((name) => name?.endsWith(".csproj")))
            frameworks.add("C#/.NET");
        if (filenames.some((name) => name?.includes("dockerfile")))
            frameworks.add("Docker");
        if (filenames.some((name) => name?.includes("/.github/workflows") ||
            name?.includes("/.gitlab-ci.yml")))
            frameworks.add("CI/CD");
    }
    const textToAnalyze = `${pr?.title || ""} ${pr?.body || ""} ${commits?.map((c) => c.commit.message).join(" ") || ""}`.toLowerCase();
    const frameworkPatterns = [
        { pattern: /react|redux/g, name: "React" },
        { pattern: /vue|vuex|nuxt/g, name: "Vue.js" },
        { pattern: /angular/g, name: "Angular" },
        { pattern: /express|fastify|koa|hapi|node\.js/g, name: "Node.js" },
        { pattern: /next\.?js/g, name: "Next.js" },
        { pattern: /django|flask|fastapi/g, name: "Python Web" },
        { pattern: /spring|hibernate/g, name: "Spring" },
        { pattern: /laravel|symfony|cake/g, name: "PHP Framework" },
        { pattern: /rails/g, name: "Ruby on Rails" },
        {
            pattern: /bootstrap|tailwind|mui|material\s*ui|chakra/g,
            name: "CSS Framework",
        },
        { pattern: /docker|kubernetes|k8s/g, name: "Containerization" },
        { pattern: /aws|azure|gcp|cloud/g, name: "Cloud Services" },
        {
            pattern: /jest|mocha|chai|enzyme|testing\s*library|cypress|playwright/g,
            name: "Testing",
        },
        { pattern: /webpack|babel|vite|parcel|rollup/g, name: "Build Tools" },
        { pattern: /graphql|apollo/g, name: "GraphQL" },
        { pattern: /mongodb|mongoose/g, name: "MongoDB" },
        { pattern: /postgres|postgresql/g, name: "PostgreSQL" },
        { pattern: /mysql/g, name: "MySQL" },
        { pattern: /redis/g, name: "Redis" },
        { pattern: /firebase|firestore/g, name: "Firebase" },
        { pattern: /ci\/cd|jenkins|github\s*actions|gitlab\s*ci/g, name: "CI/CD" },
    ];
    frameworkPatterns.forEach((fw) => {
        if (textToAnalyze.match(fw.pattern)) {
            frameworks.add(fw.name);
        }
    });
    return frameworks.size > 0
        ? Array.from(frameworks).sort().join(", ")
        : "Undetermined";
}
export async function generateResumeFromPR(prDetailedData) {
    try {
        const { pr, commits, comments, reviews } = prDetailedData;
        const prompt = `
    Generate a professional resume section based on this GitHub Pull Request:
    Repository: ${pr.base.repo.full_name}
    PR Title: ${pr.title}
    PR Description: ${pr.body || "No description provided"}
    Number of commits: ${commits.length}
    Commit messages: ${commits
            .map((commit) => commit.commit.message)
            .join("; ")}
    Lines added: ${pr.additions}
    Lines removed: ${pr.deletions}
    Files changed: ${pr.changed_files}
    Number of comments: ${comments.length}
    Number of reviews: ${reviews.length}
    Programming languages detected: ${detectLanguages(pr.files || [], pr)}
    Frameworks/libraries: ${identifyFrameworks(pr.files || [], pr, commits)}
    Based on this information, create a professional resume bullet point that:
    1. Starts with a strong action verb (Implemented, Engineered, Architected, etc.)
    2. Clearly states what was built/fixed/improved
    3. Mentions specific technologies used
    4. Quantifies the impact when possible (performance improvement, lines of code, etc.)
    5. Connects to business value (improved user experience, reduced costs, etc.)
    6. Uses concise, professional language (25-35 words max)
    Format it as a powerful achievement statement that would impress a technical hiring manager.
    `;
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are an expert technical resume writer who specializes in creating resumes for software engineers. 
You excel at:
- Using powerful action verbs (Implemented, Architected, Engineered, Optimized, etc.)
- Highlighting technical complexity and problem-solving
- Focusing on achievements and impact rather than responsibilities
- Quantifying results whenever possible (e.g., improved performance by 30%)
- Connecting technical work to business outcomes
- Being specific about technologies used
- Using professional, concise language that appeals to technical hiring managers

Your goal is to make the engineer look like a high-value contributor based on their GitHub activity.`,
                },
                { role: "user", content: prompt },
            ],
            max_tokens: 300,
            temperature: 0.7,
        });
        return response.choices[0].message.content?.trim() ?? "";
    }
    catch (error) {
        console.error("Error generating resume section from PR:", error);
        throw new Error("Failed to generate resume section from PR");
    }
}
export async function generateCompleteResume(prsData, userData) {
    try {
        const resumePromises = prsData.map((prData) => generateResumeFromPR(prData));
        const resumeSections = await Promise.all(resumePromises);
        const skills = new Set();
        prsData.forEach((pr) => {
            const lang = detectLanguages(pr.files, pr.pr);
            if (lang !== "Undetermined")
                skills.add(lang);
            const fw = identifyFrameworks(pr.files, pr.pr, pr.commits);
            if (fw !== "Undetermined")
                fw.split(", ").forEach((f) => skills.add(f));
        });
        const userName = userData.name || userData.login;
        const languagesDetected = Array.from(skills)
            .filter((s) => /^[A-Z]/.test(s.charAt(0)) &&
            !s.includes("/") &&
            s !== "CSS Framework" &&
            s !== "Cloud Services" &&
            s !== "CI/CD" &&
            s !== "Containerization" &&
            s !== "Testing" &&
            s !== "Build Tools")
            .sort()
            .join(", ") || "-";
        const frameworksToolsDetected = Array.from(skills)
            .filter((s) => !/^[A-Z]/.test(s.charAt(0)) ||
            s.includes("/") ||
            s === "CSS Framework" ||
            s === "Cloud Services" ||
            s === "CI/CD" ||
            s === "Containerization" ||
            s === "Testing" ||
            s === "Build Tools")
            .sort()
            .join(", ") || "-";
        const prompt = `
    Create a concise technical resume summary based *only* on the provided achievements from merged GitHub Pull Requests for ${userName}.
    GitHub Profile: ${userData.html_url}
    Key achievements from merged PRs:
    ${resumeSections.map((section) => `- ${section}`).join("\n")}
    Generate a resume in Markdown with the following structure:
    # ${userName}
    GitHub: ${userData.html_url}
    ## Professional Summary
    Write a 2-3 sentence summary highlighting the key technical contributions and skills demonstrated *strictly* in the provided PR achievements. Focus on impact and technologies used.
    ## Technical Skills Demonstrated in PRs
    * Languages: ${languagesDetected}
    * Frameworks/Tools: ${frameworksToolsDetected}
    ## Key Contributions (from Merged PRs)
    [List the key achievements bullet points provided above, possibly slightly rephrased for flow. Ensure each point clearly relates to a merged PR.]
    Keep the output clean, professional, and directly based on the input PR data.
    `;
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are a technical resume assistant. Your task is to synthesize provided bullet points derived from merged GitHub Pull Requests into a concise, professional resume format. Focus *only* on the information given. Do not add sections or information not directly supported by the input. Use Markdown formatting. Extract implied skills (languages, frameworks) from the achievement descriptions to populate the skills section. Use the provided user name and GitHub link.`,
                },
                { role: "user", content: prompt },
            ],
            max_tokens: 1000,
            temperature: 0.6,
        });
        return {
            resumeText: response.choices[0].message.content?.trim() ?? "",
            prBulletPoints: resumeSections,
        };
    }
    catch (error) {
        console.error("Error generating complete resume:", error);
        throw new Error("Failed to generate complete resume");
    }
}
//# sourceMappingURL=resumeGenerator.js.map