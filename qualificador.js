// qualificador.js
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Função principal para gerar resposta da IA
async function gerarResposta(messages) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("❌ Erro ao chamar OpenAI:", error.response?.data || error.message);
    throw new Error("Erro ao gerar resposta da IA.");
  }
}

// Delay entre mensagens, se necessário
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Verifica se a resposta do usuário é coerente com a etapa atual
async function isRespostaValida(etapa, texto) {
  if (!texto || texto.length < 2) return false;
  const t = texto.toLowerCase();

  if (etapa === 'nome') {
    return t.length >= 3 && !/\d/.test(t); // Nome deve ter 3+ letras e não conter números
  }

  if (etapa === 'visita') {
    return ['sim', 'não', 'nao', 'talvez', 'quero', 'interesse'].some(pal => t.includes(pal));
  }

  if (etapa === 'pagamento') {
    return ['à vista', 'avista', 'financiado', 'financiamento', 'pix', 'consórcio'].some(p => t.includes(p));
  }

  if (etapa === 'aguardando_autorizacao') {
    return ['sim', 'pode', 'mande', 'encaminhe', 'envie', 'autorizo'].some(p => t.includes(p));
  }

  return false;
}

module.exports = {
  gerarResposta,
  isRespostaValida,
  sleep,
};
