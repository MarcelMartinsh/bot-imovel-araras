const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { OpenAI } = require('openai');

const app = express();
app.use(bodyParser.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TOKEN = process.env.ZAPI_TOKEN;
const INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

app.post('/webhook', async (req, res) => {
  const { phone, text } = req.body;

  if (!text?.message) {
    console.log("❌ Mensagem vazia ou inválida recebida.");
    return res.sendStatus(200);
  }

  console.log("📨 Requisição recebida no /webhook:");
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

    const resposta = await axios.post(
      `https://api.z-api.io/instances/${INSTANCE_ID}/send-messages`,
      {
        phone: phone,
        message: respostaFinal,
      },
      {
        headers: {
          'Client-Token': TOKEN,
        },
      }
    );

    console.log("✅ Mensagem enviada com sucesso.");
    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot rodando na porta ${PORT}`);
});
