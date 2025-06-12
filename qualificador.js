const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Gera uma resposta (usado caso queira responder perguntas extras no futuro)
async function gerarResposta(messages) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4", // pode trocar por "gpt-3.5-turbo" se quiser economizar
      messages,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("❌ Erro ao chamar OpenAI:", error.response?.data || error.message);
    throw new Error("Falha ao gerar resposta do ChatGPT.");
  }
}

// Avalia se a resposta é coerente com a etapa atual
async function isRespostaValida(etapa, resposta) {
  const prompt = `
Você é um assistente que avalia respostas de clientes em um atendimento via WhatsApp sobre um imóvel à venda.

Etapa atual: ${etapa}
Mensagem do cliente: "${resposta}"

Diga apenas SIM ou NAO. A resposta é coerente com a etapa?
- Etapa "nome": resposta deve parecer um nome ou algo como "meu nome é João"
- Etapa "visita": resposta deve indicar se quer ou não visitar o imóvel
- Etapa "pagamento": resposta deve mencionar "à vista", "financiamento", "financiado" ou similar
`;

  try {
    const resultado = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "Responda apenas com 'SIM' ou 'NAO'." },
        { role: "user", content: prompt },
      ],
    });

    const conteudo = resultado.choices[0].message.content.trim().toLowerCase();
    return conteudo.includes('sim');
  } catch (err) {
    console.error("❌ Erro ao avaliar resposta:", err.message);
    return false; // por segurança, assume que não é válida
  }
}

// Não é mais usado nesse fluxo, mas mantido para compatibilidade futura
function isQualificado(resposta) {
  const texto = resposta.toLowerCase();
  return (
    texto.includes("visita") ||
    texto.includes("interesse") ||
    texto.includes("agendar") ||
    texto.includes("financiado") ||
    texto.includes("à vista")
  );
}

module.exports = {
  gerarResposta,
  isRespostaValida,
  isQualificado
};
