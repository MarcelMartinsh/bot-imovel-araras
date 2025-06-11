const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function gerarResposta(messages) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4", // pode usar "gpt-3.5-turbo" se quiser economizar
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
  return (
    texto.includes("visita") ||
    texto.includes("agendar") ||
    texto.includes("interessado") ||
    texto.includes("financiamento") ||
    texto.includes("compra") ||
    texto.includes("à vista") ||
    texto.includes("financiado")
  );
}

module.exports = { gerarResposta, isQualificado };
