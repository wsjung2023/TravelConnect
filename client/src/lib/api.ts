export async function api(url: string, opts: { method?: string; body?: any; auth?: boolean } = {}) {
  const { method = "GET", body, auth = true } = opts;
  const token = localStorage.getItem('token');
  
  const isFormData = body instanceof FormData;
  const headers: HeadersInit = {};
  
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  
  if (auth && token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const fetchOptions: RequestInit = { 
    method, 
    headers, 
    credentials: "include"
  };
  
  if (body) {
    fetchOptions.body = isFormData ? body : JSON.stringify(body);
  }
  
  const res = await fetch(url, fetchOptions);
  const ct = res.headers.get("content-type") || "";
  const out = ct.includes("application/json") ? await res.json().catch(()=>null) : await res.text().catch(()=>null);
  if (!res.ok) throw new Error(typeof out === "string" ? `${res.status} ${out}` : (out?.message || `${res.status}`));
  return out;
}