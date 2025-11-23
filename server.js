// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;
const HTML_FILE = path.join(__dirname, 'freecash-tiktok.html');

// ---------------------------------------------
// Helper que gera nomes aleatórios
// ---------------------------------------------
function randIdent(len = 8) {
  return crypto.randomBytes(len).toString('hex').slice(0, len);
}

// ---------------------------------------------
// BLOCO JUNK QUE SERÁ INJETADO
// ---------------------------------------------
function buildJunkBlock() {
  const varName = '_' + randIdent(6);
  const ts = Date.now();
  const shortHash = crypto.randomBytes(4).toString('hex');
  const uuid = uuidv4();
  const rndNum = Math.floor(Math.random() * 1e6);
  const hiddenAttr = `data-junk-${randIdent(4)}`;
  const windowProp = `window.${varName}`;

  const script = `
<script>
(function(){
  try {
    var name = "${varName}";
    var meta = {
      id: "${shortHash}",
      uuid: "${uuid}",
      ts: ${ts},
      rnd: ${rndNum}
    };
    ${windowProp} = meta;

    var d = document.createElement('div');
    d.setAttribute('${hiddenAttr}', meta.id + '-' + meta.rnd);
    d.style.display = 'none';

    var fnName = 'fn_' + Math.random().toString(36).substring(2, 10);
    window[fnName] = function() { return meta; };

    d.appendChild(document.createTextNode(fnName));
    document.body.appendChild(d);
  } catch(e) {
    console && console.log && console.log('junk inject error', e);
  }
})();
</script>
<noscript><meta name="junk-${shortHash}" content="${shortHash}-${rndNum}"></noscript>
`;

  return script;
}

// ---------------------------------------------
// Servir arquivos estáticos
// ---------------------------------------------
app.use(express.static(path.join(__dirname)));


// ---------------------------------------------
// ROTA DE HEALTH CHECK — OBRIGATÓRIA NO FLY.IO
// ---------------------------------------------
app.get('/', (req, res) => {
  res.status(200).send('OK');
});


// ---------------------------------------------
// /freecash → sempre gera um novo slug
// ---------------------------------------------
app.get('/freecash', (req, res) => {
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(3).toString('hex').slice(0, 6);
  const slug = `lander-${timestamp}-${randomStr}.html`;

  res.redirect(`/${slug}`);
});


// ---------------------------------------------
// /lander-xxxxx-xxxx.html → serve HTML injetado
// ----------------------------------------------------------------
app.get('/lander-:ts-:rand.html', (req, res) => {
  let html;
  try {
    html = fs.readFileSync(HTML_FILE, 'utf8');
  } catch (err) {
    return res.status(500).send('HTML not found');
  }

  const junk = buildJunkBlock();

  if (html.includes('<!-- JUNK_INJECT -->')) {
    html = html.replace('<!-- JUNK_INJECT -->', junk);
  } else {
    html = html.replace('</body>', `${junk}\n</body>`);
  }

  res.set('X-Lander-Timestamp', req.params.ts);
  res.set('X-Lander-Random', req.params.rand);

  res.send(html);
});


// ---------------------------------------------
// CATCH-ALL (qualquer outra rota escreve HTML "fixo")
// ---------------------------------------------
app.get('*', (req, res) => {
  let html;
  try {
    html = fs.readFileSync(HTML_FILE, 'utf8');
  } catch (err) {
    return res.status(500).send('HTML not found');
  }

  const junk = buildJunkBlock();

  if (html.includes('<!-- JUNK_INJECT -->')) {
    html = html.replace('<!-- JUNK_INJECT -->', junk);
  } else {
    html = html.replace('</body>', `${junk}\n</body>`);
  }

  res.set('X-Build-Id', crypto.randomBytes(4).toString('hex'));
  res.send(html);
});


// ---------------------------------------------
// INICIAR SERVIDOR
// ---------------------------------------------
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
