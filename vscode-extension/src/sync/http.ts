import * as http from "http";
import * as https from "https";
import { URL } from "url";

interface HttpResponse {
  status: number;
  ok: boolean;
  data: string;
  json<T>(): T;
}

function makeResponse(res: http.IncomingMessage): Promise<HttpResponse> {
  return new Promise((resolve) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      const status = res.statusCode ?? 500;
      resolve({
        status,
        ok: status >= 200 && status < 300,
        data,
        json<T>() {
          return JSON.parse(data) as T;
        },
      });
    });
  });
}

export function httpGet(urlString: string): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const opts: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: "GET",
      agent: false, // bypass VS Code's proxy agent
    };

    const client = url.protocol === "https:" ? https : http;
    const req = client.request(opts, (res) => {
      makeResponse(res).then(resolve);
    });
    req.on("error", reject);
    req.end();
  });
}

export function httpPost(
  urlString: string,
  body: unknown,
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const payload = JSON.stringify(body);
    const opts: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: "POST",
      agent: false, // bypass VS Code's proxy agent
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const client = url.protocol === "https:" ? https : http;
    const req = client.request(opts, (res) => {
      makeResponse(res).then(resolve);
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}
