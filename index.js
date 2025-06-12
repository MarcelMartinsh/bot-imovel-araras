const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const { gerarResposta, isRespostaValida } = require('./qualificador');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const sessions = {};

app.post('/webhook', async (req, res) => {
  const phone = req.body.phone;
  const message = req.body.text?.message?.trim();

  if (!message || !phone) return res.sendStatus(400);

  const gatilho = 'olá, gostaria de falar sobre o imóvel do jardim universitário, de araras/sp.';
  const texto = message.toLowerCase();

  // Gatilho inicial obrigatório
  if (!sessions[phone]) {
    if (texto === gatilho.toLowerCase()) {
      sessions[phone] = {
        etapa: 'nome',
        aguardandoResposta: true,
        nome: '', visita: '', pagamento: '', historico: []
      };
      await sendMessage(phone, 'Ótimo! Para começar, por favor me informe seu nome.');
    }
    return res.sendStatus(200);
  }

  const sessao = sessions[phone];

  // Se já finalizou, não fala mais
  if (sessao.etapa === 'concluido') return res.sendStatus(200);

  // Só continua se estiver aguardando resposta
  if (!sessao.aguardandoResposta) return res.sendStatus(200);

  // Confirma se a resposta é válida
  const respostaOk = await isRespostaValida(sessao.etapa, message);
  if (!respostaOk) {
    await sendMessage(phone, 'Desculpe, não entendi sua resposta. Pode reformular?');
    return res.sendStatus(200);
  }

  sessao.aguardandoResposta = false;

  if (sessao.etapa === 'nome') {
    sessao.nome = message;
    sessao.etapa = 'visita';
    sessao.aguardandoResposta = true;
    await sendMessage(phone, 'Obrigado! Você gostaria de agendar uma visita ao imóvel?');

  } else if (sessao.etapa === 'visita') {
    sessao.visita = message;
    sessao.etapa = 'pagamento';
    sessao.aguardandoResposta = true;
    await sendMessage(phone, 'Como pretende realizar o pagamento? Financiado ou à vista?');

  } else if (sessao.etapa === 'pagamento') {
    sessao.pagamento = message;
    sessao.etapa = 'aguardando_autorizacao';
    sessao.aguardandoResposta = true;

    const resumo = `Nome: ${sessao.nome}\nVisita: ${sessao.visita}\nPagamento: ${sessao.pagamento}`;
    sessao.historico.push({ role: 'user', content: resumo });

    const respostaIA = await gerarResposta([
      { role: 'system', content: process.env.GPT_PROMPT || 'Você é um assistente para atendimento de leads de imóvel.' },
      ...sessao.historico
    ]);

    sessao.historico.push({ role: 'assistant', content: respostaIA });

    await sendMessage(phone, respostaIA);
    await sendMessage(phone, 'Deseja que eu encaminhe suas informações ao corretor responsável? Responda "sim" para confirmar.');
  
  } else if (sessao.etapa === 'aguardando_autorizacao') {
    if (texto.includes('sim')) {
      const resumo = `📥 *Novo lead qualificado!*\nWhatsApp: ${phone}\nNome: ${sessao.nome}\nVisita: ${sessao.visita}\nPagamento: ${sessao.pagamento}`;
      await sendMessage(process.env.CORRETOR_PHONE, resumo);
      await sendMessage(phone, 'Perfeito! Suas informações foram encaminhadas ao corretor. Ele entrará em contato.');
    } else {
      await sendMessage(phone, 'Tudo bem! Se decidir depois, é só me avisar.');
    }
    sessao.etapa = 'concluido';
  }

  res.sendStatus(200);
});

async function sendMessage(phone, message) {
  try {
    await axios.post(`${process.env.ZAPI_BASE_URL}/send-text`, { phone, message }, {
      headers: {
        'Content-Type': 'application/json',
        'client-token': process.env.ZAPI_CLIENT_TOKEN
      }
    });
    console.log(`📤 Mensagem enviada para ${phone}: ${message}`);
  } catch (err) {
    console.error(`❌ Erro ao enviar mensagem para ${phone}:`, err.response?.data || err.message);
  }
}

app.listen(port, () => {
  console.log(`🚀 Bot rodando na porta ${port}`);
});
