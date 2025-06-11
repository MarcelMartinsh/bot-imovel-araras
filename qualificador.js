const axios = require('axios');

// Garante que o prompt está definido corretamente
const promptBase = process.env.GPT_PROMPT;

if (!promptBase || promptBase.length < 10) {
  console.warn("⚠️ ATENÇÃO: GPT_PROMPT não está definido corretamente no .env!");
}

async function gerarResposta(history) {
  // Garante que o primeiro item do histórico é o system prompt
  if (!history || history.length === 0 || history[0].role !== 'system') {
    history.unshift({ role: 'system', content: promptBase || "Você é um assistente de atendimento imobiliário." });
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: history,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
      }
    );

    const resposta = response.data.choices[0].message.content;
    return resposta;
  } catch (error) {
    console.error("❌ Erro ao chamar OpenAI:", error.response?.data || error.message);
    throw new Error("Falha ao gerar resposta do ChatGPT.");
  }
}

// Detecção de lead qualificado com lógica mais precisa
function isQualificado(resposta) {
  const texto = resposta.toLowerCase();
  const sinais = ['visita', 'agendar', 'interessado', 'financiamento', 'entrar em contato', 'corretor ramon'];

  // Se 2 ou mais sinais forem encontrados, considera qualificado
  const contagem = sinais.filter(p => texto.includes(p)).length;
  return contagem >= 2;
}

module.exports = {
  gerarResposta,
  isQualificado,
};
