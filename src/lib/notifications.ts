import nodemailer from 'nodemailer';

// --- GMAIL CONFIGURATION ---
const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: gmailUser,
        pass: gmailAppPassword,
    },
});

/**
 * Sends an email using Gmail SMTP.
 * @param to Email address of the recipient
 * @param subject Subject line of the email
 * @param html HTML content of the email body
 */
export async function sendEmail(to: string, subject: string, html: string) {
    if (!gmailUser || !gmailAppPassword) {
        console.warn(`[Mock Email] To: ${to} | Subject: ${subject}`);
        console.log(`[Email Content]\n${html}\n`);
        return { success: true, mocked: true };
    }

    try {
        const info = await transporter.sendMail({
            from: `"PH Core Latam" <${gmailUser}>`,
            to,
            subject,
            html,
        });

        return { success: true, messageId: info.messageId };
    } catch (err: any) {
        console.error("Failed to send email:", err);
        return { success: false, error: err?.message || 'Unknown error' };
    }
}

// --- LABSMOBILE CONFIGURATION ---
const labsMobileUsername = process.env.LABSMOBILE_USERNAME;
const labsMobileToken = process.env.LABSMOBILE_TOKEN;

/**
 * Sends an SMS message using LabsMobile REST API.
 * @param to Phone number of the recipient (e.g., 573211234567)
 * @param body Text content of the SMS message
 */
export async function sendSMS(to: string, body: string) {
    if (!labsMobileUsername || !labsMobileToken) {
        console.warn(`[Mock SMS] To: ${to} | Body: ${body}`);
        return { success: true, mocked: true };
    }

    try {
        // LabsMobile recommended POST configuration
        const authHeader = "Basic " + Buffer.from(`${labsMobileUsername}:${labsMobileToken}`).toString("base64");

        // Clean phone number (remove + or any space if it exists)
        let cleanTo = to.replace(/[\+\s\-]/g, '');

        // Default to Colombia (+57) if only 10 digits are provided
        if (cleanTo.length === 10) {
            cleanTo = '57' + cleanTo;
        }

        const response = await fetch("https://api.labsmobile.com/json/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": authHeader,
                "Cache-Control": "no-cache"
            },
            body: JSON.stringify({
                message: body,
                tpoa: "Aviso",
                recipient: [
                    { msisdn: cleanTo } // Must include country code without '+', e.g., '57...'
                ]
            })
        });

        const data = await response.json();

        // LabsMobile usually returns "0" code for success from json API
        if (data.code !== "0") {
            console.error("LabsMobile API Error:", data);
            return { success: false, error: data.message || 'LabsMobile failed' };
        }

        return { success: true, data };
    } catch (err: any) {
        console.error("Failed to send SMS via LabsMobile:", err);
        return { success: false, error: err?.message || 'Unknown error' };
    }
}
