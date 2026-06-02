const url = "https://iutbvmvwzzexmhtkcsgc.supabase.co/functions/v1/create-inter-pix";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dGJ2bXZ3enpleG1odGtjc2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzgwNzQsImV4cCI6MjA5NTY1NDA3NH0.fPSixtVEjiDxDYWJ_Jv3OL7HEIk3NXLyH3gja-QcmAE";

const CONCURRENT_REQUESTS = 50;

async function makeRequest(id) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${anonKey}`,
        "apikey": anonKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ amount: 5000 }) // R$ 50,00
    });
    
    const text = await res.text();
    const duration = Date.now() - start;
    
    let json;
    try { json = JSON.parse(text); } catch(e) {}
    
    if (res.ok) {
      console.log(`[${id}] Sucesso (${duration}ms) - TxId: ${json?.transaction_id}`);
      return { id, success: true, duration };
    } else {
      console.log(`[${id}] Erro ${res.status} (${duration}ms) - ${text.substring(0, 100)}`);
      return { id, success: false, status: res.status, duration };
    }
  } catch (err) {
    const duration = Date.now() - start;
    console.log(`[${id}] Falha de rede (${duration}ms) - ${err.message}`);
    return { id, success: false, error: err.message, duration };
  }
}

async function runLoadTest() {
  console.log(`Iniciando teste de carga com ${CONCURRENT_REQUESTS} requisições simultâneas...`);
  console.log(`Alvo: ${url}`);
  
  const promises = [];
  for (let i = 1; i <= CONCURRENT_REQUESTS; i++) {
    promises.push(makeRequest(i));
  }
  
  const results = await Promise.all(promises);
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgDuration = results.reduce((acc, r) => acc + r.duration, 0) / results.length;
  
  console.log(`\n=== RESUMO DO TESTE ===`);
  console.log(`Total: ${CONCURRENT_REQUESTS}`);
  console.log(`Sucesso (PIX Gerado): ${successful}`);
  console.log(`Falhas: ${failed}`);
  console.log(`Tempo médio de resposta: ${avgDuration.toFixed(0)}ms`);
}

runLoadTest();
