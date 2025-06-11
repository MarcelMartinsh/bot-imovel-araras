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
  console.log('📩 Requisição recebida no /webhook:', JSON.stringify(req.body));

  const phone = req.body.phone;
  const message = req.body.text?.message?.trim().toLowerCase();

  if (!message || !phone) {
    return res.status(400).send('Faltando dados.');
  }

  if (!sessions[phone]) {
    if (!message.includes('interesse')) {
      await sendMessage(phone, 'Olá! Para começarmos, envie a palavra *interesse*.');
      return res.sendStatus(200);
    }

    sessions[phone] = {
      etapa: 1,
      nome: '',
      visita: '',
      pagamento: '',
      historico: [{ role: 'system', content: process.env.GPT_PROMPT }],
      resumo: '',
      aguardandoConfirmacao: false
    };

    await sendMessage(phone, 'Ótimo! Por favor, poderia me informar seu nome?');
    return res.sendStatus(200);
  }

  const sessao = sessions[phone];

  try {
    if (sessao.aguardandoConfirmacao) {
      if (message === 'sim') {
        await sendMessage(
          process.env.CORRETOR_PHONE,
          `📥 *Novo lead qualificado!*
WhatsApp: ${phone}
Resumo:
${sessao.resumo}`
        );
        await sendMessage(phone, '✅ Suas informações foram enviadas ao corretor. Ele entrará em contato em breve!');
      } else {
        await sendMessage(phone, '👍 Tudo bem! Se precisar de mais informações, é só me chamar.');
      }
      sessao.aguardandoConfirmacao = false;
      return res.sendStatus(200);
    }

    if (sessao.etapa === 1) {
      sessao.nome = message;
      sessao.etapa = 2;
      await sendMessage(phone, 'Obrigado! Você gostaria de fazer uma visita ao imóvel?');
    } else if (sessao.etapa === 2) {
      sessao.visita = message;
      sessao.etapa = 3;
      await sendMessage(phone, 'Como pretende realizar o pagamento? Financiado ou à vista?');
    } else if (sessao.etapa === 3) {
      sessao.pagamento = message;
      sessao.etapa = 4;

      const historicoUsuario = `
Nome: ${sessao.nome}
Deseja visita: ${sessao.visita}
Forma de pagamento: ${sessao.pagamento}`.trim();

      sessao.historico.push({ role: 'user', content: historicoUsuario });
      const resposta = await gerarResposta(sessao.historico);
      sessao.historico.push({ role: 'assistant', content: resposta });

      sessao.resumo = resposta;

      await sendMessage(phone, resposta);
      await sendMessage(phone, 'Deseja que eu envie essas informações ao corretor responsável para que ele entre em contato com você? (Digite "sim" ou "não")');
      sessao.aguardandoConfirmacao = true;
    } else {
      await sendMessage(phone, 'Agradecemos seu interesse. Caso tenha mais dúvidas, estou à disposição.');
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erro ao processar:', err.message);
    await sendMessage(phone, '⚠️ Ocorreu um erro. Tente novamente mais tarde.');
    res.sendStatus(500);
  }
});

async function sendMessage(phone, message) {
  try {
    const url = `${process.env.ZAPI_BASE_URL}/send-text`;
    const response = await axios.post(
      url,
      { phone, message },
      {
        headers: {
          'Content-Type': 'application/json',
          'client-token': process.env.ZAPI_CLIENT_TOKEN
        }
      }
    );
    console.log(`📤 Mensagem enviada para ${phone}: ${message}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Erro ao enviar mensagem para ${phone}:`, error.response?.data || error.message);
  }
}

app.listen(port, () => {
  console.log(`🚀 Bot rodando na porta ${port}`);
});
