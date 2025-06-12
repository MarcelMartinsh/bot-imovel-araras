// qualificador.js atualizado com verificação via IA também
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

// Novo: IA avalia se a resposta é coerente com a etapa
async function iaValidaResposta(etapa, texto) {
  try {
    const systemPrompt = `
Você é um assistente que valida se uma resposta enviada por um usuário faz sentido com base na etapa da conversa.

Etapas:
- nome: usuário deve informar um nome válido.
- visita: usuário deve dizer se quer visitar o imóvel.
- pagamento: usuário deve dizer como pretende pagar.
- aguardando_autorizacao: usuário deve autorizar ou não o envio ao corretor.

Retorne apenas "sim" ou "nao".
`;

    const userPrompt = `Etapa atual: ${etapa}
Resposta do usuário: "${texto}"`;

    const res = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
    });

    const resposta = res.choices[0].message.content.trim().toLowerCase();
    return resposta.includes("sim");
  } catch (err) {
    console.error("❌ Erro na IA de validação:", err.message);
    return false;
  }
}

// Valida se a resposta é coerente com a etapa
async function isRespostaValida(etapa, texto) {
  if (!texto || texto.length < 2) return false;

  const validaPadrao = {
    nome: t => t.length >= 3 && !/\d/.test(t),
    visita: t => ['sim', 'não', 'nao', 'talvez', 'quero'].some(p => t.includes(p.toLowerCase())),
    pagamento: t => ['vista', 'financiado', 'pix', 'financiamento'].some(p => t.includes(p.toLowerCase())),
    aguardando_autorizacao: t => ['sim', 'pode', 'encaminhe', 'mande'].some(p => t.includes(p.toLowerCase())),
  };

  const textoLC = texto.toLowerCase();

  // Primeiro verifica pelo padrão tradicional
  const padraoOk = validaPadrao[etapa]?.(textoLC);

  if (padraoOk) return true;

  // Se não passou, pede ajuda à IA
  return await iaValidaResposta(etapa, texto);
}

module.exports = { gerarResposta, isRespostaValida };
