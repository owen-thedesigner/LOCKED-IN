require("dotenv").config();

const express = require("express");
const path = require("path");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_api_key_here") {
      return res.status(503).json({
        error: "Add your OpenAI API key to the .env file, then restart LOCK IN."
      });
    }

    const messages = req.body?.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
      return res.status(400).json({ error: "Please send a valid chat conversation." });
    }

    const safeMessages = messages
      .filter((message) =>
        message &&
        ["user", "assistant"].includes(message.role) &&
        typeof message.content === "string"
      )
      .map((message) => ({
        role: message.role,
        content: message.content.slice(0, 3000)
      }));

    if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== "user") {
      return res.status(400).json({ error: "Send a message to the coach first." });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions: [
        "You are LOCK IN Coach, a supportive and practical coach for a teenager.",
        "Help with habits, school productivity, balanced fitness, music practice, sleep routines, and general organization.",
        "Be encouraging but not cheesy. Keep answers concise, clear, and actionable.",
        "Never encourage extreme exercise, skipping meals, restrictive eating, supplements, or chasing a particular body shape.",
        "For nutrition, focus on regular meals, variety, hydration, and energy rather than calories or weight.",
        "For training, emphasize safe technique, rest, gradual progress, and adult or qualified-coach supervision.",
        "Do not diagnose medical or mental health conditions. For serious health or safety concerns, encourage talking with a trusted adult and an appropriate professional.",
        "Ask at most one question at a time when more context is needed."
      ].join(" "),
      input: safeMessages.map((m) => ({
        role: m.role,
        content: [{ type: "input_text", text: m.content }]
      })),
      store: false
    });

    res.json({ reply: response.output_text || "I couldn't form a response. Try again." });
  } catch (error) {
    console.error("Coach API error:", error.message);
    res.status(500).json({
      error: "The coach couldn't connect right now. Check your API key and server terminal, then try again."
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`LOCK IN is running at http://localhost:${PORT}`);
});
