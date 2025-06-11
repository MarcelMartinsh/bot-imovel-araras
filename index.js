const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const { gerarResposta, isQualificado } = require('./qualificador');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Armazena sessões por telefone
const sessions = {};

// Rota raiz (health check do Render)
app.get('/', (req, res) => {
  res.sendStatus(200);
});

// Webhook da Z-API
app.post('/webhook', async (req, res) => {
  console.log('📩 Requisição recebida no /webhook:', JSON.stringify(req.body));

  const phone = req.body.phone;
  const message = req.body.text?.message;

  if (!message || !phone) {
    console.warn('⚠️ Requisição malformada:', req.body);
    return res.status(400).send('Faltando dados.');
  }

  // Inicia sessão se for a primeira mensagem com "interesse"
  if (!sessions[phone]) {
    if (!message.toLowerCase().includes('interesse')) {
      await sendMessage(phone, 'Olá! Para começarmos, envie a palavra *interesse*.');
      return res.sendStatus(200);
    }

    sessions[phone] = {
      historico: [{ role: 'system', content: process.env.GPT_PROMPT }],
      etapaAtual: 1
    };

    console.log(`🤖 Nova sessão iniciada para ${phone}`);
    await sendMessage(phone, 'Ótimo! Por favor, poderia me informar seu nome para que eu possa anotar seu interesse?');
    return res.sendStatus(200);
  }

  const sessao = sessions[phone];
  sessao.historico.push({ role: 'user', content: message });

  try {
    const resposta = await gerarResposta(sessao.historico);
    sessao.historico.push({ role: 'assistant', content: resposta });

    // Controle de etapas
    if (sessao.etapaAtual === 1) {
      await sendMessage(phone, 'Obrigado! Agora, você gostaria de fazer uma visita ao imóvel?');
      sessao.etapaAtual = 2;
    } else if (sessao.etapaAtual === 2) {
      await sendMessage(phone, 'E sobre o pagamento, você pretende financiar ou pagar à vista?');
      sessao.etapaAtual = 3;
    } else if (sessao.etapaAtual === 3) {
      await sendMessage(phone, resposta); // Resposta final
      if (isQualificado(resposta)) {
        console.log(`✅ Lead qualificado detectado: ${phone}`);
        await sendMessage(
          process.env.CORRETOR_PHONE,
          `📥 *Novo lead qualificado!*\nWhatsApp: ${phone}\nResumo:\n${resposta}`
        );
      }
      sessao.etapaAtual = 4; // Etapa finalizada
    } else {
      await sendMessage(phone, 'Agradecemos seu interesse. Caso tenha mais dúvidas, estou por aqui!');
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erro ao gerar resposta:', err.message);
    await sendMessage(phone, '⚠️ Ocorreu um erro ao processar sua mensagem. Tente novamente em instantes.');
    res.sendStatus(500);
  }
});

// Função de envio para Z-API
async function sendMessage(phone, message) {
  try {
    const url = `${process.env.ZAPI_BASE_URL}/send-text`;
    const response = await axios.post(url, {
      phone,
      message
    }, {
      headers: {
        'Content-Type': 'application/json',
        'client-token': process.env.ZAPI_CLIENT_TOKEN // Obrigatório
      }
    });

    console.log(`📤 Mensagem enviada para ${phone}: ${message}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Erro ao enviar mensagem para ${phone}:`, error.response?.data || error.message);
  }
}

app.listen(port, () => {
  console.log(`🚀 Bot rodando na porta ${port}`);
});
