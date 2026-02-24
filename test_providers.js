const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

async function testProviders() {
    console.log("Testing Gmail Connection...");
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });

    try {
        const info = await transporter.sendMail({
            from: `"Test" <${process.env.GMAIL_USER}>`,
            to: process.env.GMAIL_USER, // Send to self
            subject: 'Test connection',
            text: 'Testing SMTP connection',
        });
        console.log("Gmail Success: ", info.messageId);
    } catch (e) {
        console.error("Gmail Error: ", e.message);
    }

    console.log("Testing LabsMobile Connection...");
    try {
        const authHeader = "Basic " + Buffer.from(`${process.env.LABSMOBILE_USERNAME}:${process.env.LABSMOBILE_TOKEN}`).toString("base64");

        const response = await fetch("https://api.labsmobile.com/json/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": authHeader,
                "Cache-Control": "no-cache"
            },
            body: JSON.stringify({
                message: "Test",
                tpoa: "Sender",
                recipient: [{ msisdn: "573000000000" }]
            })
        });

        const data = await response.json();
        if (data.code !== "0") {
            console.error("LabsMobile API Error:", data);
        } else {
            console.log("LabsMobile API Success:", data);
        }
    } catch (e) {
        console.error("LabsMobile Exception:", e.message);
    }
}

testProviders();
