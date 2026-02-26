import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function POST(request: Request) {
    try {
        const { html, fileName } = await request.json() as { html: string, fileName?: string };

        if (!html) {
            return NextResponse.json({ error: "Missing HTML content" }, { status: 400 });
        }

        let browser;

        if (process.env.NODE_ENV === 'development') {
            const puppeteer = (await import('puppeteer')).default;
            browser = await puppeteer.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                headless: true
            });
        } else {
            const puppeteerCore = (await import('puppeteer-core')).default;
            const chromium = (await import('@sparticuz/chromium')).default;
            const executablePath = await chromium.executablePath();
            browser = await puppeteerCore.launch({
                args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
                defaultViewport: { width: 1200, height: 800 },
                executablePath: executablePath || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                headless: true,
            });
        }

        const page = await browser.newPage();

        // Emulate print media type for better PDF rendering
        await page.emulateMediaType('print');

        await page.setContent(`
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { background-color: white; color: black; font-family: Arial, sans-serif; padding: 40px; margin: 0; box-sizing: border-box; }
                    * { box-sizing: border-box; }
                </style>
            </head>
            <body>
                ${html}
            </body>
            </html>
        `);

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '30px', right: '30px', bottom: '30px', left: '30px' }
        });

        await browser.close();

        return new NextResponse(pdfBuffer as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${fileName || 'document.pdf'}"`,
            },
        });
    } catch (error: any) {
        console.error("Error generating PDF:", error);
        return NextResponse.json({ error: error.message || "Failed to generate PDF" }, { status: 500 });
    }
}
