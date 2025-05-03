import puppeteer, { Browser } from "puppeteer";
import fs from "fs/promises";
import path from "path";
import { marked } from "marked";

interface PdfResumeData {
  resumeText: string;
}

export async function generatePDFFromResume(
  resumeData: PdfResumeData,
  outputFilePath: string | null = null
): Promise<Buffer> {
  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
      executablePath:
        process.platform === "darwin"
          ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
          : undefined,
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
    });

    const rawResumeText =
      resumeData.resumeText || "No resume content available";
    const cleanedResumeText = rawResumeText.replace(
      /^```markdown\n|\n```$/g,
      ""
    );
    const resumeHtml = marked.parse(cleanedResumeText);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: Arial, sans-serif;
              line-height: 1.5;
              margin: 0;
              padding: 0;
              color: #333;
              font-size: 11pt;
            }
            h1, h2, h3 {
              margin-top: 1.2em;
              margin-bottom: 0.5em;
              line-height: 1.2;
              font-weight: normal;
              color: #2c3e50;
            }
            h1 { font-size: 18pt; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            h2 { font-size: 14pt; border-bottom: 1px solid #eee; padding-bottom: 3px; }
            h3 { font-size: 12pt; }
            p { margin-bottom: 0.8em; }
            ul { padding-left: 20px; margin-bottom: 0.8em; }
            li { margin-bottom: 0.3em; }
            strong { font-weight: bold; }
            a { color: #3498db; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          ${resumeHtml} 
        </body>
      </html>
    `;

    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    const pdf = await page.pdf({
      format: "A4",
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
      printBackground: true,
      preferCSSPageSize: true,
      timeout: 30000,
    });

    if (!pdf || pdf.length === 0) {
      throw new Error("Generated PDF is empty");
    }

    if (outputFilePath) {
      const outputDir = path.dirname(outputFilePath);
      await fs.mkdir(outputDir, { recursive: true });
      const absolutePath = path.resolve(outputFilePath);

      await fs.writeFile(absolutePath, pdf);
    }

    return Buffer.from(pdf);
  } catch (error: any) {
    console.error("Error generating resume PDF:", error);
    throw new Error(`Failed to generate resume PDF: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
