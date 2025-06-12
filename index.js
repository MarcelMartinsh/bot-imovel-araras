// index.js atualizado com controle de etapas, validação e espera inteligente
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const { gerarResposta, isRespostaValida, sleep } = require('./qualificador');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const sessions = {};

app.get('/', (req, res) => {
  res.sendStatus(200);
});

app.post('/webhook', async (req, res) => {
  const phone = req.body.phone;
  const message = req.body.text?.message?.trim();

  if (!message || !phone) return res.sendStatus(400);

  // Gatilho de início
  const gatilho = "olá, gostaria de falar sobre o imóvel do jardim universitário, de araras/sp.";
  const gatilhoNormalizado = gatilho.toLowerCase();
  const msgNormalizada = message.toLowerCase();

  if (!sessions[phone] && !msgNormalizada.includes(gatilhoNormalizado)) {
    return res.sendStatus(200); // ignora qualquer mensagem que não seja o gatilho
  }

  if (!sessions[phone]) {
    sessions[phone] = {
      etapa: 'nome',
      nome: '',
      visita: '',
      pagamento: '',
      autorizado: false,
      historico: [{ role: 'system', content: process.env.GPT_PROMPT }]
    };
    await sendMessage(phone, 'Ótimo! Por favor, poderia me informar seu nome?');
    return res.sendStatus(200);
  }

  const sessao = sessions[phone];

  try {
    if (sessao.etapa === 'nome') {
      if (await isRespostaValida('nome', message)) {
        sessao.nome = message;
        sessao.etapa = 'visita';
        await sleep(1000);
        await sendMessage(phone, 'Obrigado! Você gostaria de fazer uma visita ao imóvel?');
      } else {
        await sendMessage(phone, 'Desculpe, poderia repetir seu nome?');
      }
    } else if (sessao.etapa === 'visita') {
      if (await isRespostaValida('visita', message)) {
        sessao.visita = message;
        sessao.etapa = 'pagamento';
        await sleep(1000);
        await sendMessage(phone, 'Como pretende realizar o pagamento? Financiado ou à vista?');
      } else {
        await sendMessage(phone, 'Você poderia confirmar se deseja fazer uma visita ao imóvel?');
      }
    } else if (sessao.etapa === 'pagamento') {
      if (await isRespostaValida('pagamento', message)) {
        sessao.pagamento = message;
        sessao.etapa = 'aguardando_autorizacao';

        const historicoUsuario = `Nome: ${sessao.nome}\nDeseja visita: ${sessao.visita}\nForma de pagamento: ${sessao.pagamento}`;
        sessao.historico.push({ role: 'user', content: historicoUsuario });

        const resposta = await gerarResposta(sessao.historico);
        sessao.historico.push({ role: 'assistant', content: resposta });

        await sleep(1000);
        await sendMessage(phone, resposta);
        await sleep(1000);
        await sendMessage(phone, 'Deseja que eu encaminhe sua conversa ao corretor responsável?');
      } else {
        await sendMessage(phone, 'Como pretende realizar o pagamento? Por favor, informe se é à vista, financiado, etc.');
      }
    } else if (sessao.etapa === 'aguardando_autorizacao') {
      if (await isRespostaValida('aguardando_autorizacao', message)) {
        sessao.etapa = 'finalizado';
        await sendMessage(
          process.env.CORRETOR_PHONE,
          `📥 *Novo lead qualificado!*
WhatsApp: ${phone}
Nome: ${sessao.nome}
Deseja visita: ${sessao.visita}
Pagamento: ${sessao.pagamento}`
        );
        await sendMessage(phone, 'Perfeito, encaminhei seu contato ao corretor. Ele responderá em breve!');
      } else {
        await sendMessage(phone, 'Você deseja que eu encaminhe ao corretor agora?');
      }
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
