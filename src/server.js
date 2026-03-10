import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/rank-trades", async (req, res) => {
  try {
    const { trades } = req.body;

    const prompt = `
Rank these option trades from best to worst.

Return JSON only.

Trades:
${JSON.stringify(trades, null, 2)}
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    res.json({ result: response.output_text });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "AI ranking failed" });
  }
});

app.listen(3001, () => {
  console.log("AI server running on http://localhost:3001");
});