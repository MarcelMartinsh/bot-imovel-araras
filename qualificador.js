const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Função final inteligente (usada após as 3 etapas)
async function gerarResposta(messages) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("❌ Erro ao chamar OpenAI:", error.response?.data || error.message);
    throw new Error("Falha ao gerar resposta do ChatGPT.");
  }
}

// Valida se a resposta faz sentido para a etapa atual
async function isRespostaValida(etapa, mensagem) {
  const texto = mensagem.toLowerCase();

  if (etapa === 'nome') {
    // Nome deve ter pelo menos 2 palavras e ser texto
    return texto.length > 3 && !texto.includes('http') && isNaN(texto);
  }

  if (etapa === 'visita') {
    return ['sim', 'não', 'nao', 'talvez', 'quero', 'gostaria'].some(p => texto.includes(p));
  }

  if (etapa === 'pagamento') {
    return ['vista', 'financiado', 'financiamento', 'parcelado'].some(p => texto.includes(p));
  }

  if (etapa === 'aguardando_autorizacao') {
    return texto.includes('sim') || texto.includes('não') || texto.includes('nao');
  }

  return false;
}

module.exports = { gerarResposta, isRespostaValida };
