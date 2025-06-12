const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Gera resposta com IA da OpenAI
async function gerarResposta(messages) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4", // ou "gpt-3.5-turbo"
      messages,
      temperature: 0.7,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("❌ Erro ao chamar OpenAI:", error.response?.data || error.message);
    throw new Error("Falha ao gerar resposta do ChatGPT.");
  }
}

// Verifica se o lead explicitamente pediu o contato com o corretor
function isQualificado(respostaCliente) {
  const texto = respostaCliente.toLowerCase();
  return (
    texto.includes("pode encaminhar") ||
    texto.includes("pode passar") ||
    texto.includes("pode enviar") ||
    texto.includes("quero falar com o corretor") ||
    texto.includes("sim, pode encaminhar")
  );
}

module.exports = { gerarResposta, isQualificado };
