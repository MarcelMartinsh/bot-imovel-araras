const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { OpenAI } = require('openai');

const app = express();
app.use(bodyParser.json());

// CONFIGURAÇÃO DO BOT
const INSTANCE_ID = '3E25D92604A4304948AE06E9A5181015';
const TOKEN = 'F8be546a575774bf7af6c68199bff0ae9S';
const GATILHO = 'interesse imovel';

// CONFIGURAÇÃO DO OPENAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

app.post('/webhook', async (req, res) => {
  const { phone, text } = req.body;
  const mensagem = text?.message?.toLowerCase() || '';

  // Ignora mensagens que não contêm o gatilho
  if (!mensagem.includes(GATILHO)) {
    console.log('📭 Mensagem sem gatilho. Ignorada.');
    return res.sendStatus(200);
  }

  console.log('📨 Mensagem com gatilho recebida:');
  console.log(req.body);

  const prompt = `
Você é um assistente educado e profissional que responde potenciais compradores interessados em um imóvel de alto padrão localizado em Araras/SP. Use a seguinte estrutura na resposta:

1. Agradeça o interesse.
2. Destaque as características do imóvel: 4 suítes, cozinha moderna, área gourmet, piscina, grande terreno com jardins, fachada imponente.
3. Encaminhe o interessado ao corretor responsável Ramon Guiral - WhatsApp (19) 99990-2492.
4. Seja objetivo, claro e gentil.

Mensagem recebida do cliente: "${text.message}"

Resposta:
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const respostaFinal = completion.choices[0].message.content;
    console.log(`💬 Enviando resposta para ${phone}: ${respostaFinal}`);

    // ENVIO COM ENDPOINT /send-text
    const resposta = await axios.post(
      `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`,
      {
        phone: phone,
        message: respostaFinal,
      }
    );

    console.log('✅ Mensagem enviada com sucesso:', resposta.data);
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.response?.data || error.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot rodando na porta ${PORT}`);
});
