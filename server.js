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

  // A small script that creates a hidden element, a global var and a function.
  // It's intentionally harmless — just metadata + tiny function.
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
    // expose to window
    ${windowProp} = meta;
    // create a tiny hidden node so the DOM differs each request
    var d = document.createElement('div');
    d.setAttribute('${hiddenAttr}', meta.id + '-' + meta.rnd);
    d.style.display = 'none';
    // add a small randomized function name
    var fnName = 'fn_' + Math.random().toString(36).substring(2, 10);
    window[fnName] = function() { return meta; };
    d.appendChild(document.createTextNode(fnName));
    document.body.appendChild(d);
  } catch(e) {
    // swallow: non-critical
    console && console.log && console.log('junk inject error', e);
  }
})();
</script>
<noscript><meta name="junk-${shortHash}" content="${shortHash}-${rndNum}"></noscript>
`;

  return script;
}

// Serve static assets if you add any
app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
  // read base HTML (synchronous is fine for small demo)
  let html;
  try {
    html = fs.readFileSync(HTML_FILE, 'utf8');
  } catch (err) {
    res.status(500).send('HTML not found');
    return;
  }

  // Build the junk block and insert before closing </body>
  const junk = buildJunkBlock();
  if (html.includes('<!-- JUNK_INJECT -->')) {
    html = html.replace('<!-- JUNK_INJECT -->', junk);
  } else {
    // fallback: insert before </body>
    html = html.replace('</body>', `${junk}\n</body>`);
  }

  // Add a server-side header with a build id (helpful for debugging)
  res.set('X-Build-Id', crypto.randomBytes(4).toString('hex'));

  res.send(html);
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
