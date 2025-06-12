const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const { gerarResposta, isQualificado } = require('./qualificador');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const sessions = {};

const GATILHO = "olá, gostaria de falar sobre o imóvel do jardim universitário, de araras/sp.";

app.post('/webhook', async (req, res) => {
  const body = req.body;
  const phone = body.phone;
  const message = body.text?.message?.trim();

  if (!message || !phone) return res.sendStatus(400);

  const msg = message.toLowerCase();

  // Se não há sessão ainda e mensagem é diferente do gatilho → ignora totalmente
  if (!sessions[phone] && msg !== GATILHO) return res.sendStatus(200);

  // Início da conversa com gatilho
  if (!sessions[phone]) {
    sessions[phone] = {
      etapa: 1,
      nome: '',
      visita: '',
      pagamento: '',
      historico: [{ role: 'system', content: process.env.GPT_PROMPT }]
    };

    await sendMessage(phone, 'Ótimo! Por favor, poderia me informar seu nome?');
    return res.sendStatus(200);
  }

  const sessao = sessions[phone];

  try {
    if (sessao.etapa === 1) {
      sessao.nome = message;
      sessao.etapa = 2;
      await sendMessage(phone, 'Obrigado! Você gostaria de agendar uma visita ao imóvel?');
    } else if (sessao.etapa === 2) {
      sessao.visita = message;
      sessao.etapa = 3;
      await sendMessage(phone, 'Como pretende realizar o pagamento? Financiado ou à vista?');
    } else if (sessao.etapa === 3) {
      sessao.pagamento = message;
      sessao.etapa = 4;

      const resumoLead = `
Nome: ${sessao.nome}
Deseja visita: ${sessao.visita}
Forma de pagamento: ${sessao.pagamento}
`.trim();

      sessao.historico.push({ role: 'user', content: resumoLead });
      const resposta = await gerarResposta(sessao.historico);
      sessao.historico.push({ role: 'assistant', content: resposta });

      await sendMessage(phone, resposta);

      // Espera confirmação explícita para encaminhar
      await sendMessage(phone, 'Deseja que eu encaminhe essas informações ao corretor?');
      sessao.etapa = 5;
    } else if (sessao.etapa === 5) {
      if (isQualificado(message)) {
        await sendMessage(process.env.CORRETOR_PHONE, `📥 *Novo lead qualificado!*\nWhatsApp: ${phone}\nResumo:\n${sessao.historico.map(m => m.content).join('\n\n')}`);
        await sendMessage(phone, 'Perfeito! Encaminhei suas informações ao corretor. Ele entrará em contato em breve.');
        delete sessions[phone];
      } else {
        await sendMessage(phone, 'Tudo bem. Ficarei à disposição caso decida falar com o corretor.');
        delete sessions[phone];
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erro:', err.message);
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
          'client-token': process.env.ZAPI_CLIENT_TOKEN
        }
      }
    );
    console.log(`📤 Mensagem enviada para ${phone}: ${message}`);
  } catch (error) {
    console.error(`❌ Erro ao enviar mensagem para ${phone}:`, error.response?.data || error.message);
  }
}

app.listen(port, () => {
  console.log(`🚀 Bot rodando na porta ${port}`);
});
