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

// ------------------------
// Helper: generate slug
// ------------------------
function genSlug() {
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(3).toString('hex').slice(0, 6);
  return `lander-${timestamp}-${randomStr}.html`;
}

// Middleware: simple request logger (useful em produção para debug)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ---------------------------------------------------------------
// 1) /freecash → gera SEMPRE uma slug nova e redirect
// ---------------------------------------------------------------
app.get('/freecash', (req, res) => {
  const slug = genSlug();
  // prevenir cache do redirect
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  console.log(`Redirecting /freecash -> /${slug}`);
  return res.redirect(302, `/${slug}`);
});

// ---------------------------------------------------------------
// 2) ROTA DINÂMICA (regex) — qualquer /lander-<ts>-<rand>.html
//    esta rota NÃO serve HTML; ela sempre gera outro slug e redireciona
//    isso garante que F5 sempre mude a URL
// ---------------------------------------------------------------
app.get(/^\/lander-\d+-[a-f0-9]{1,}\.html$/i, (req, res) => {
  const newSlug = genSlug();
  // prevenir cache do redirect
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  console.log(`Redirecting ${req.originalUrl} -> /${newSlug}`);
  return res.redirect(302, `/${newSlug}`);
});

// ---------------------------------------------------------------
// Serve static files (se houver) - colocado DEPOIS das rotas dinâmicas
// para garantir que rotas dinâmicas tenham prioridade sobre arquivos estáticos.
// ---------------------------------------------------------------
app.use(express.static(path.join(__dirname), {
  index: false,
  // explicit: don't let static set caching that interferes
  setHeaders: (res, path) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  }
}));

// ---------------------------------------------------------------
// 3) Catch-all — entrega o HTML final com junk inject
//    e também define headers para evitar cache.
// ---------------------------------------------------------------
app.get('*', (req, res) => {
  let html;
  try {
    html = fs.readFileSync(HTML_FILE, 'utf8');
  } catch (err) {
    console.error('HTML read error', err);
    return res.status(500).send('HTML not found');
  }

  const junk = buildJunkBlock();

  if (html.includes('<!-- JUNK_INJECT -->')) {
    html = html.replace('<!-- JUNK_INJECT -->', junk);
  } else {
    html = html.replace('</body>', `${junk}\n</body>`);
  }

  // evitar cache do HTML final
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.set('X-Build-Id', crypto.randomBytes(4).toString('hex'));
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
