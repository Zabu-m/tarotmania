// Deno + Gemini API ile basit HTTP sunucu

const GEMINI_API_KEY = "AIzaSyC_HaGU9nuQxEhvzSwEhKkRjuezBR8Qn0c";
const PORT = 3000;

// Statik dosya sunumu ekle (index.html, tarot-images.json, images/*)
async function serveStaticFile(pathname) {
  // Güvenlik için .. ile yukarı çıkışı engelle
  if (pathname.includes("..")) return null;
  let filePath = pathname === "/" ? "/index.html" : pathname;
  try {
    const file = await Deno.readFile("." + filePath);
    // İçerik tipi belirle
    let contentType = "text/plain";
    if (filePath.endsWith(".html")) contentType = "text/html";
    else if (filePath.endsWith(".js")) contentType = "application/javascript";
    else if (filePath.endsWith(".json")) contentType = "application/json";
    else if (filePath.endsWith(".css")) contentType = "text/css";
    else if (filePath.match(/\.(jpg|jpeg)$/)) contentType = "image/jpeg";
    else if (filePath.endsWith(".png")) contentType = "image/png";
    return new Response(file, {
      status: 200,
      headers: { "Content-Type": contentType, "Access-Control-Allow-Origin": "*" },
    });
  } catch {
    return null;
  }
}

async function handleRequest(req) {
  const { pathname } = new URL(req.url);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (pathname === "/api/ai" && req.method === "POST") {
    try {
      const body = await req.json();
      const prompt = body.prompt;
      if (!prompt) {
        return new Response(JSON.stringify({ error: "prompt gerekli" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // Gemini 2.0 Flash modelini ve X-goog-api-key header'ını kullan
      const geminiRes = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": GEMINI_API_KEY
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ]
          }),
        }
      );
      const geminiJson = await geminiRes.json();

      // Yalnızca fal yorumunu döndür, gizli veya gereksiz bilgileri çıkar
      let falYorumu = "";
      if (
        geminiJson &&
        geminiJson.candidates &&
        geminiJson.candidates[0] &&
        geminiJson.candidates[0].content &&
        geminiJson.candidates[0].content.parts &&
        geminiJson.candidates[0].content.parts[0] &&
        geminiJson.candidates[0].content.parts[0].text
      ) {
        falYorumu = geminiJson.candidates[0].content.parts[0].text;
      } else {
        falYorumu = "Fal yorumu alınamadı.";
      }

      // Basit bir HTML tasarım ile dön (isteğe göre düzenleyebilirsin)
      const html = `
        <div style="background:#fffbe8;border-radius:10px;padding:22px 18px 18px 18px;box-shadow:0 2px 8px #0001;font-family:system-ui,Arial,sans-serif;max-width:600px;margin:auto;">
          <div style="font-size:18px;font-weight:bold;color:#b45309;margin-bottom:10px;">Tarot Falı Yorumu</div>
          <div style="font-size:15px;line-height:1.7;color:#222;">
            ${falYorumu
              .replace(/\n{2,}/g, "<br><br>")
              .replace(/\n/g, "<br>")
              .replace(/\*\*(.*?)\*\*/g, '<span style="font-weight:bold;color:#7c3aed;">$1</span>')}
          </div>
        </div>
      `;

      return new Response(JSON.stringify({ html, text: falYorumu }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  }

  // Statik dosya sunumu
  const staticResp = await serveStaticFile(pathname);
  if (staticResp) return staticResp;

  // Diğer yollar
  return new Response("Not found", { status: 404 });
}

console.log(`Deno sunucusu http://localhost:${PORT} üzerinde çalışıyor`);
Deno.serve({ port: PORT }, handleRequest);
