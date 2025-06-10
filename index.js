const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

console.log("🚀 Bot rodando na porta", PORT);

app.post("/webhook", async (req, res) => {
  try {
    const data = req.body;
    console.log("📨 Requisição recebida no /webhook:");
    console.log(JSON.stringify(data, null, 2));

    const userMessage = data.text?.message;
    const chatLid = data.chatLid;

    if (!userMessage || !chatLid) {
      console.error("❌ Dados inválidos: mensagem ou chatLid ausente.");
      return res.status(400).send("Dados inválidos");
    }

    // Enviar a mensagem para a OpenAI
    const completion = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "Você é um assistente educado e objetivo que responde dúvidas sobre um imóvel à venda em Araras/SP. Seja cordial, breve e sempre recomende o contato com o corretor Ramon Guiral no WhatsApp (19) 99990-2492 ao final.",
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const respostaGpt = completion.data.choices[0].message.content;

    console.log(`💬 Enviando resposta para ${chatLid}: ${respostaGpt}`);

    // Enviar resposta via Z-API (usando chatLid no lugar de phone)
    await axios.post(
      `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-message`,
      {
        chatId: chatLid, // <--- ESSA é a correção principal
        message: respostaGpt,
      }
    );

    console.log("✅ Mensagem enviada com sucesso.");
    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

app.get("/", (req, res) => {
  res.send("Bot está online!");
});

app.listen(PORT);
