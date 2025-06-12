// qualificador.js atualizado com controle de etapas e delay inteligente
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Gera uma resposta do ChatGPT com histórico
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

// Delay entre respostas (em milissegundos)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Valida se a resposta é coerente com a etapa
async function isRespostaValida(etapa, texto) {
  if (!texto || texto.length < 2) return false;
  const t = texto.toLowerCase();

  if (etapa === 'nome') {
    return t.length >= 3 && !/\d/.test(t); // Nome não deve conter números
  }

  if (etapa === 'visita') {
    return ['sim', 'não', 'nao', 'talvez', 'quero'].some(pal => t.includes(pal));
  }

  if (etapa === 'pagamento') {
    return ['vista', 'financiado', 'pix', 'financiamento'].some(p => t.includes(p));
  }

  if (etapa === 'aguardando_autorizacao') {
    return ['sim', 'pode', 'encaminhe', 'mande'].some(p => t.includes(p));
  }

  return false;
}

module.exports = { gerarResposta, isRespostaValida, sleep };
