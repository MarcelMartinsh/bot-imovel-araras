const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function gerarResposta(messages) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4", // ou "gpt-3.5-turbo"
      messages,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("❌ Erro ao chamar OpenAI:", error.response?.data || error.message);
    throw new Error("Falha ao gerar resposta do ChatGPT.");
  }
}

function isQualificado(resposta) {
  const texto = resposta.toLowerCase();
  return texto.includes("visita") || texto.includes("agendar") || texto.includes("interessado");
}

module.exports = { gerarResposta, isQualificado };
