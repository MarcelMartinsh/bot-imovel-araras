require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const qualificarLead = require('./qualificador');

const app = express();
app.use(bodyParser.json());

// CONFIGURAÇÕES
const INSTANCE_ID = process.env.INSTANCE_ID;
const TOKEN = process.env.CLIENT_TOKEN;
const API_URL = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('🤖 Bot de atendimento está online!');
});

app.post('/webhook', async (req, res) => {
  const body = req.body;

  // Loga o corpo completo da requisição para análise
  console.log('🔍 Corpo recebido:', JSON.stringify(body, null, 2));

  // ✅ Correção: extrai corretamente o número e a mensagem
  const phone = body.phone || body.sender?.phone || body.from || null;
  const message =
    body.text?.message ||
    body.message?.body?.text ||
    body.message?.text ||
    body.message ||
    body.body ||
    null;

  if (!phone || !message) {
    console.warn('📭 Requisição sem telefone ou mensagem válida.');
    return res.status(400).json({ error: 'Telefone ou mensagem ausente.' });
  }

  console.log(`📩 Mensagem recebida de ${phone}: ${message}`);

  // Qualificação do lead
  const leadQualificado = qualificarLead({ phone, message });

  if (!leadQualificado) {
    console.log('🚫 Lead não qualificado. Ignorando.');
    return res.sendStatus(204); // No Content
  }

  try {
    console.log('🧠 Enviando para o ChatGPT...');

    const completion = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente cordial que responde dúvidas de clientes interessados em um imóvel à venda.'
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
    console.log('🧠 Resposta gerada pelo ChatGPT:', respostaFinal);

    console.log('📤 Enviando mensagem pelo Z-API...');
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

    console.log(`✅ Mensagem enviada com sucesso para ${phone}`);
    res.sendStatus(200);

  } catch (error) {
    console.error('❌ Erro no processamento:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Erro ao processar a mensagem.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
