const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const { gerarResposta } = require('./qualificador');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const sessions = {};

app.get('/', (req, res) => {
  res.sendStatus(200);
});

app.post('/webhook', async (req, res) => {
  console.log('📩 Webhook recebido:', JSON.stringify(req.body));

  const phone = req.body.phone;
  const message = req.body.text?.message?.trim();

  if (!phone || !message) return res.status(400).send('Dados ausentes');

  if (!sessions[phone]) {
    if (!message.toLowerCase().includes('interesse')) {
      await sendMessage(phone, 'Olá! Para começarmos, envie a palavra *interesse*.');
      return res.sendStatus(200);
    }

    sessions[phone] = {
      etapa: 1,
      nome: '',
      visita: '',
      pagamento: '',
      consentimento: '',
      historico: [{ role: 'system', content: process.env.GPT_PROMPT }]
    };

    await sendMessage(phone, 'Ótimo! Qual é o seu nome, por favor?');
    return res.sendStatus(200);
  }

  const sessao = sessions[phone];

  try {
    switch (sessao.etapa) {
      case 1:
        sessao.nome = message;
        sessao.etapa = 2;
        await sendMessage(phone, 'Obrigado! Você gostaria de visitar o imóvel?');
        break;

      case 2:
        sessao.visita = message;
        sessao.etapa = 3;
        await sendMessage(phone, 'Como pretende realizar o pagamento? Financiado ou à vista?');
        break;

      case 3:
        sessao.pagamento = message;
        sessao.etapa = 4;
        await sendMessage(phone, 'Deseja que eu encaminhe essas informações ao corretor? (sim/não)');
        break;

      case 4:
        if (message.toLowerCase().includes('sim')) {
          sessao.etapa = 5;
          sessao.consentimento = 'sim';

          const resumo = `
Nome: ${sessao.nome}
Visita: ${sessao.visita}
Pagamento: ${sessao.pagamento}
          `.trim();

          sessao.historico.push({ role: 'user', content: resumo });
          const resposta = await gerarResposta(sessao.historico);
          sessao.historico.push({ role: 'assistant', content: resposta });

          await sendMessage(phone, resposta);

          await sendMessage(
            process.env.CORRETOR_PHONE,
            `📥 *Novo lead qualificado!*\nWhatsApp: ${phone}\nResumo:\n${resumo}\n\nResposta do bot:\n${resposta}`
          );
        } else {
          await sendMessage(phone, 'Tudo bem! Se mudar de ideia, estou por aqui.');
          sessao.etapa = 99;
        }
        break;

      default:
        await sendMessage(phone, 'Se precisar de mais ajuda, estou à disposição!');
        break;
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erro no bot:', err.message);
    await sendMessage(phone, '⚠️ Ocorreu um erro. Tente novamente mais tarde.');
    res.sendStatus(500);
  }
});

async function sendMessage(phone, message) {
  try {
    const url = `${process.env.ZAPI_BASE_URL}/send-text`;
    await axios.post(
      url,
      { phone, message },
      {
        headers: {
          'Content-Type': 'application/json',
          'client-token': process.env.ZAPI_CLIENT_TOKEN,
        }
      }
    );
    console.log(`📤 Enviado para ${phone}: ${message}`);
  } catch (error) {
    console.error(`❌ Falha ao enviar para ${phone}:`, error.response?.data || error.message);
  }
}

app.listen(port, () => {
  console.log(`🚀 Bot ativo na porta ${port}`);
});
