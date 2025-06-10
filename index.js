require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/webhook', async (req, res) => {
  console.log("📨 Requisição recebida no /webhook:");
  console.log(JSON.stringify(req.body, null, 2)); // imprime formatado

  return res.sendStatus(200); // sempre responde 200 para evitar erro na Z-API
});

app.get('/', (req, res) => {
  res.send('Bot rodando na porta ' + PORT);
});

app.listen(PORT, () => {
  console.log(`Bot rodando na porta ${PORT}`);
});
