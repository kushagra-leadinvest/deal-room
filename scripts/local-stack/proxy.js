// Minimal Supabase-style gateway: /rest/v1 → PostgREST, /auth/v1 → GoTrue
const http = require("http");
const routes = [["/rest/v1", 3001], ["/auth/v1", 9999]];
http.createServer((req, res) => {
  const r = routes.find(([p]) => req.url.startsWith(p));
  if (!r) { res.writeHead(404); return res.end(); }
  if (req.method === "OPTIONS") { res.writeHead(204, cors(req)); return res.end(); }
  const up = http.request({ host: "127.0.0.1", port: r[1], path: req.url.slice(r[0].length) || "/", method: req.method, headers: req.headers }, (u) => {
    res.writeHead(u.statusCode, { ...u.headers, ...cors(req) }); u.pipe(res);
  });
  up.on("error", (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(up);
}).listen(8000);
function cors(req) { return { "access-control-allow-origin": req.headers.origin || "*", "access-control-allow-headers": req.headers["access-control-request-headers"] || "*", "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS", "access-control-allow-credentials": "true", "access-control-expose-headers": "content-range,x-total-count" }; }
