const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { OpenAI } = require('openai');

const app = express();
app.use(bodyParser.json());

const ZAPI_TOKEN = process.env.ZAPI_TOKEN;
const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

app.post('/webhook', async (req, res) => {
  console.log("📨 Requisição recebida no /webhook:");
  console.log(JSON.stringify(req.body, null, 2));

  const { phone, text } = req.body;

  if (!phone || !text || !text.message) {
    console.log("❌ Mensagem ou número ausente. Ignorando.");
    return res.status(400).send('Bad Request');
  }

  const mensagem = text.message;

  try {
    const respostaIA = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente de vendas de imóveis. Seja cordial, objetivo e sempre direcione o cliente ao corretor Ramon Guiral no WhatsApp (19) 99990-2492 para mais detalhes.'
        },
        {
          role: 'user',
          content: mensagem
        }
      ],
      temperature: 0.6
    });

    const resposta = respostaIA.choices[0].message.content;

    console.log(`💬 Enviando resposta para ${phone}: ${resposta}`);

    await axios.post(
      `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/send-messages`,
      {
        phone: phone,
        message: resposta
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': ZAPI_TOKEN
        }
      }
    );

    console.log("✅ Mensagem enviada com sucesso.");
    res.status(200).send('OK');
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem:", error.response?.data || error.message);
    res.status(500).send('Erro interno');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot rodando na porta ${PORT}`);
});
