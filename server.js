// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 8080;
const HTML_FILE = path.join(__dirname, "freecash.html");

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function randIdent(len = 8) {
  return crypto.randomBytes(len).toString("hex").slice(0, len);
}

function buildJunkBlock() {
  const varName = "_" + randIdent(6);
  const ts = Date.now();
  const shortHash = crypto.randomBytes(4).toString("hex");
  const uuid = uuidv4();
  const rndNum = Math.floor(Math.random() * 1e6);
  const hiddenAttr = `data-junk-${randIdent(4)}`;
  const windowProp = `window.${varName}`;

  const script = `
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
    d.setAttribute('${hiddenAttr}', meta.id + "-" + meta.rnd);
    d.style.display = 'none';

    var fnName = "fn_" + Math.random().toString(36).substring(2, 10);
    window[fnName] = function(){ return meta; };

    d.appendChild(document.createTextNode(fnName));
    document.body.appendChild(d);

  } catch(e) {
    console.log("junk inject error", e);
  }
})();
</script>
<noscript><meta name="junk-${shortHash}" content="${shortHash}-${rndNum}"></noscript>
`;

  return script;
}

// -------------------------------------------------------
// Static
// -------------------------------------------------------
app.use(express.static(path.join(__dirname)));


// -------------------------------------------------------
// /freecash → gera slug e redireciona
// -------------------------------------------------------
app.get("/freecash", (req, res) => {
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(3).toString("hex").slice(0, 6);
  const slug = `lander-${timestamp}-${randomStr}.html`;

  res.redirect(`/${slug}`);
});


// -------------------------------------------------------
// /lander-*.html → serve HTML com junk
// -------------------------------------------------------
app.get(/^\/lander-\d+-[a-f0-9]+\.html$/i, (req, res) => {
  let html;

  try {
    html = fs.readFileSync(HTML_FILE, "utf8");
  } catch (err) {
    return res.status(500).send("HTML not found");
  }

  const junk = buildJunkBlock();

  html = html.replace("</body>", `${junk}</body>`);

  res.set("Cache-Control", "no-store");
  res.send(html);
});


// -------------------------------------------------------
// Catch-all
// -------------------------------------------------------
app.get("*", (req, res) => {
  res.status(404).send("Not found");
});


// -------------------------------------------------------
// Start server
// -------------------------------------------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});
