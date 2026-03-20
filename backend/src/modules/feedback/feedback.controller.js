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

        // UI response
        if (type === "yes") {
            return res.send(`
        <html>
          <body style="font-family:sans-serif;text-align:center;margin-top:50px;">
            <h2>🙏 Thank you!</h2>
            <p>Our team will contact you within 24 hours.</p>
          </body>
        </html>
      `);
        }

        return res.send(`
      <html>
        <body style="font-family:sans-serif;text-align:center;margin-top:50px;">
          <h2>⚡ Thank you!</h2>
          <p>We're glad you had a great experience.</p>
        </body>
      </html>
    `);

    } catch (err) {
        console.error("❌ Feedback Error:", err.message);
        res.status(500).send("Server error");
    }
};