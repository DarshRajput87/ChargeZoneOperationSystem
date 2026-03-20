// src/modules/feedback/feedback.controller.js

const service = require("./feedback.service");

exports.handleFeedback = async (req, res) => {
    try {
        const { mobile, type } = req.query;

        if (!mobile || !type) {
            return res.status(400).send("Invalid request");
        }

        if (!["yes", "no"].includes(type)) {
            return res.status(400).send("Invalid response");
        }

        const result = await service.saveFeedback(mobile, type);

        if (!result.status) {
            return res.status(404).send("<h2>User not found</h2>");
        }

        console.log(`✅ Feedback: ${mobile} → ${type}`);

        // Attractive UI response helper
        const getResponseHtml = (icon, title, message) => `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&display=swap" rel="stylesheet">
            <style>
                body {
                    margin: 0; padding: 0; min-height: 100vh;
                    display: flex; justify-content: center; align-items: center;
                    background: radial-gradient(circle at top right, #1a1a2e, #16213e, #0f3460);
                    font-family: 'Outfit', sans-serif; color: #fff; overflow: hidden;
                }
                .card {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 3.5rem 2rem;
                    border-radius: 32px;
                    text-align: center;
                    max-width: 420px;
                    width: 90%;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
                    animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(30px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .icon {
                    font-size: 5rem; margin-bottom: 1.5rem; display: block;
                    filter: drop-shadow(0 10px 15px rgba(0,0,0,0.3));
                    animation: bounce 2s ease-in-out infinite;
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                h2 {
                    margin: 0 0 1rem; font-size: 2.2rem; font-weight: 600;
                    background: linear-gradient(45deg, #00d2ff, #92fe9d);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                }
                p {
                    margin: 0; font-size: 1.1rem; color: #ccd; font-weight: 400; line-height: 1.6;
                }
                .accent { color: #00d2ff; font-weight: 600; }
            </style>
        </head>
        <body>
            <div class="card">
                <span class="icon">${icon}</span>
                <h2>${title}</h2>
                <p>${message}</p>
            </div>
        </body>
        </html>
        `;

        if (type === "yes") {
            return res.send(getResponseHtml(
                "🙏",
                "Thank You!",
                "Our team will contact you within <span class='accent'>24 hours</span>."
            ));
        }

        return res.send(getResponseHtml(
            "⚡",
            "Awesome!",
            "We're glad you had a <span class='accent'>great experience</span> today."
        ));

    } catch (err) {
        console.error("❌ Feedback Error:", err.message);
        res.status(500).send("Server error");
    }
};