// index.js (com fluxo robusto e controle anti-spam)
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const { gerarResposta, isRespostaValida } = require('./qualificador');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const sessions = {}; // Memória de sessão por número
const processing = new Set(); // Controle de execução paralela

app.post('/webhook', async (req, res) => {
  const phone = req.body.phone;
  const message = req.body.text?.message?.trim();
  if (!message || !phone) return res.sendStatus(400);

  // Gatilho obrigatório
  const gatilho = 'olá, gostaria de falar sobre o imóvel do jardim universitário, de araras/sp.';
  const texto = message.toLowerCase();

  // Evita processamento paralelo
  if (processing.has(phone)) return res.sendStatus(200);
  processing.add(phone);

  try {
    if (!sessions[phone]) {
      if (texto === gatilho.toLowerCase()) {
        sessions[phone] = {
          etapa: 'nome', nome: '', visita: '', pagamento: '', historico: []
        };
        await sendMessage(phone, 'Ótimo! Para começar, por favor me informe seu nome.');
      }
      return;
    }

    const sessao = sessions[phone];
    const etapaAtual = sessao.etapa;
    if (etapaAtual === 'concluido') return;

    const respostaOk = await isRespostaValida(etapaAtual, message);
    if (!respostaOk) {
      await sendMessage(phone, 'Desculpe, não entendi sua resposta. Pode reformular?');
      return;
    }

    if (etapaAtual === 'nome') {
      sessao.nome = message;
      sessao.etapa = 'visita';
      await sendMessage(phone, 'Obrigado! Você gostaria de agendar uma visita ao imóvel?');
    } else if (etapaAtual === 'visita') {
      sessao.visita = message;
      sessao.etapa = 'pagamento';
      await sendMessage(phone, 'E como pretende realizar o pagamento? Financiado ou à vista?');
    } else if (etapaAtual === 'pagamento') {
      sessao.pagamento = message;
      sessao.etapa = 'aguardando_autorizacao';

      const resumo = `Nome: ${sessao.nome}\nVisita: ${sessao.visita}\nPagamento: ${sessao.pagamento}`;
      sessao.historico.push({ role: 'user', content: resumo });

      const respostaFinal = await gerarResposta([
        { role: 'system', content: process.env.GPT_PROMPT || 'Você é um assistente para atendimento de leads de imóvel.' },
        ...sessao.historico
      ]);

      sessao.historico.push({ role: 'assistant', content: respostaFinal });
      await sendMessage(phone, respostaFinal);

      await sendMessage(phone, 'Deseja que eu encaminhe suas informações ao corretor responsável? Responda "sim" para confirmar.');
    } else if (etapaAtual === 'aguardando_autorizacao') {
      if (texto.includes('sim')) {
        const resumo = `📥 *Novo lead qualificado!*\nWhatsApp: ${phone}\nNome: ${sessao.nome}\nVisita: ${sessao.visita}\nPagamento: ${sessao.pagamento}`;
        await sendMessage(process.env.CORRETOR_PHONE, resumo);
        await sendMessage(phone, 'Perfeito! Suas informações foram encaminhadas ao corretor. Ele entrará em contato.');
        sessao.etapa = 'concluido';
      } else {
        await sendMessage(phone, 'Tudo bem! Se decidir depois, é só me avisar.');
        sessao.etapa = 'concluido';
      }
    }
  } catch (err) {
    console.error(`❌ Erro ao processar mensagem de ${phone}:`, err);
  } finally {
    processing.delete(phone);
    res.sendStatus(200);
  }
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
