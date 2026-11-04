// Local-only instrumentation for the catalogue browser suite. Never deploy this.
import http from "node:http";
const target = process.env.BUSLANE_TEST_URL || "http://127.0.0.1:3187";
let records = [],
  fault;
http
  .createServer(async (req, res) => {
    if (req.url === "/__test/reset") {
      records = [];
      fault = undefined;
      res.end("{}");
      return;
    }
    if (req.url === "/__test/stats") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(records));
      return;
    }
    if (req.url === "/__test/fault" && req.method === "POST") {
      let body = "";
      for await (const chunk of req) body += chunk;
      fault = JSON.parse(body);
      res.end("{}");
      return;
    }
    const started = performance.now();
    try {
      let upstream;
      if (fault && req.url.includes(fault.path)) {
        upstream = Response.json(
          { error: "Injected catalogue lifecycle response" },
          { status: fault.status },
        );
        fault = undefined;
      } else
        upstream = await fetch(new URL(req.url, target), {
          headers: { Authorization: req.headers.authorization || "" },
          signal: AbortSignal.timeout(30000),
        });
      const bytes = Buffer.from(await upstream.arrayBuffer());
      records.push({
        path: req.url,
        status: upstream.status,
        bytes: bytes.length,
        elapsed_ms: performance.now() - started,
        authenticated: !!req.headers.authorization,
      });
      const headers = Object.fromEntries(
        [...upstream.headers].filter(
          ([key]) =>
            ![
              "content-length",
              "content-encoding",
              "transfer-encoding",
              "connection",
            ].includes(key),
        ),
      );
      res.writeHead(upstream.status, headers);
      res.end(bytes);
    } catch {
      res.writeHead(502);
      res.end("{}");
    }
  })
  .listen(Number(process.env.FARES_PROXY_PORT || 3190), "127.0.0.1", () =>
    console.log("Local catalogue test proxy ready"),
  );
