// qualificador.js
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Gera a resposta final do ChatGPT com base no histórico de conversa
async function gerarResposta(messages) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("❌ Erro ao chamar OpenAI:", error.response?.data || error.message);
    throw new Error("Erro ao gerar resposta com IA.");
  }
}

// Valida a resposta de cada etapa para evitar avanço indevido
async function isRespostaValida(etapa, mensagem) {
  const texto = mensagem.trim().toLowerCase();

  if (!mensagem) return false;

  switch (etapa) {
    case 'nome':
      return texto.length > 1; // Aceita qualquer nome não vazio
    case 'visita':
      return ['sim', 'não', 'nao', 'talvez'].some(p => texto.includes(p));
    case 'pagamento':
      return ['vista', 'financiado', 'financiamento'].some(p => texto.includes(p));
    case 'aguardando_autorizacao':
      return ['sim', 'não', 'nao'].some(p => texto.includes(p));
    default:
      return false;
  }
}

module.exports = { gerarResposta, isRespostaValida };
