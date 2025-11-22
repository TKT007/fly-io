// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;
const HTML_FILE = path.join(__dirname, 'freecash.html');

// Helpers -----------------------------------------------------
function randIdent(len = 8) {
  return crypto.randomBytes(len).toString('hex').slice(0, len);
}

function buildJunkBlock() {
  const varName = '_' + randIdent(6);
  const ts = Date.now();
  const shortHash = crypto.randomBytes(4).toString('hex');
  const uuid = uuidv4();
  const rndNum = Math.floor(Math.random() * 1e6);
  const hiddenAttr = `data-junk-${randIdent(4)}`;
  const windowProp = `window.${varName}`;

  return `
<script>
(function(){
  try {
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
  } catch(e){}
})();
</script>
<noscript><meta name="junk-${shortHash}" content="${shortHash}-${rndNum}"></noscript>
`;
}

function genSlug() {
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(3).toString('hex').slice(0, 6);
  return `lander-${timestamp}-${randomStr}.html`;
}

// ---------------------------------------------------------------
// /freecash → GERA SLUG NOVA UMA ÚNICA VEZ
// ---------------------------------------------------------------
app.get('/freecash', (req, res) => {
  const slug = genSlug();
  res.set('Cache-Control', 'no-store');
  console.log(`[freecash] -> redirect to /${slug}`);
  res.redirect(`/${slug}`);
});

// ---------------------------------------------------------------
// /lander-*.html → SERVE HTML (NÃO REDIRECIONA!)
// ---------------------------------------------------------------
app.get(/^\/lander-\d+-[a-f0-9]+\.html$/i, (req, res) => {
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
    html = html.replace('</body>', `${junk}</body>`);
  }

  // impede cache (mantém slug, mas conteúdo muda)
  res.set('Cache-Control', 'no-store');

  res.send(html);
});

// ---------------------------------------------------------------
// Static files — depois das rotas dinâmicas
// ---------------------------------------------------------------
app.use(express.static(path.join(__dirname), { index: false }));

// Catch-all opcional
app.get('*', (req, res) => {
  res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
