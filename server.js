// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;
const HTML_FILE = path.join(__dirname, 'freecash.html');

// Helper to generate random JS identifier-like strings
function randIdent(len = 8) {
  return crypto.randomBytes(len).toString('hex').slice(0, len);
}

// Build the "junk" block to be injected into HTML
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

// Serve static files if needed
app.use(express.static(path.join(__dirname)));


// ---------------------------------------------------------------
// 1) /freecash → gera SEMPRE uma slug nova
// ---------------------------------------------------------------
app.get('/freecash', (req, res) => {
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(3).toString('hex').slice(0, 6);
  const slug = `lander-${timestamp}-${randomStr}.html`;
  res.redirect(`/${slug}`);
});


// ---------------------------------------------------------------
// 2) Lander NUNCA serve HTML — gera sempre outra slug nova
//    Assim qualquer refresh troca a URL automaticamente
// ---------------------------------------------------------------
app.get('/lander-:ts-:rand.html', (req, res) => {
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(3).toString('hex').slice(0, 6);
  const newSlug = `lander-${timestamp}-${randomStr}.html`;

  res.redirect(`/${newSlug}`);
});


// ---------------------------------------------------------------
// 3) Catch-all — aqui sim entrega o HTML final com junk inject
// ---------------------------------------------------------------
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


app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
