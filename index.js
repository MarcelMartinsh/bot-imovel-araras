require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// CONFIGURAÇÕES DO BOT
const INSTANCE_ID = process.env.INSTANCE_ID;
const TOKEN = process.env.CLIENT_TOKEN;
const API_URL = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`;
const GATILHO = 'interesse imovel';

// CONFIG OPENAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('🤖 Bot de atendimento está online!');
});

app.post('/webhook', async (req, res) => {
  const body = req.body;

  const phone = body.phone || body.sender?.phone || body.from;
  const message = body.message?.body?.text || body.message;

  if (!phone || !message) {
    console.warn('📭 Requisição sem telefone ou mensagem válida.');
    return res.status(400).json({ error: 'Parâmetros ausentes.' });
  }

  console.log(`📩 Mensagem recebida de ${phone}: ${message}`);

  // Verifica o gatilho
  if (!message.toLowerCase().includes(GATILHO.toLowerCase())) {
    console.log('⚠️ Gatilho não identificado. Ignorando.');
    return res.sendStatus(204);
  }

  try {
    // Requisição para o ChatGPT
    const completion = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Você é um atendente cordial especializado em vendas de imóveis de alto padrão.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const respostaFinal = completion.data.choices[0].message.content.trim();
    console.log(`🤖 Resposta do ChatGPT: ${respostaFinal}`);

    // Envia a resposta para o WhatsApp via Z-API
    const envio = await axios.post(
      API_URL,
      {
        phone: phone,
        message: respostaFinal
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'client-token': TOKEN
        }
      }
    );

    console.log(`✅ Resposta enviada para ${phone}`);
    res.sendStatus(200);

  } catch (error) {
    console.error('❌ Erro no processamento:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Erro ao processar a mensagem.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
