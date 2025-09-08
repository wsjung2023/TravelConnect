const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export async function api(path: string, opts: {
  method?: string;
  body?: any;
  auth?: boolean;
  headers?: Record<string, string>;
} = {}) {
  const { method = "GET", body, auth = true, headers = {} } = opts;
  // Replit Auth는 세션 기반이므로 토큰 대신 세션 사용
  const token = localStorage.getItem("access_token") || localStorage.getItem("authToken") || localStorage.getItem("token");
  const h: Record<string, string> = { "Content-Type": "application/json", ...headers };
  if (auth && token) h.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method, headers: h,
    credentials: "include",
    ...(body && { body: JSON.stringify(body) }),
  });

  let data: any = null;
  try { data = await res.clone().json(); } catch { /* text or empty */ }

  if (!res.ok) {
    const msg = data?.message || res.statusText;
    console.error("❌ API FAIL", { path, status: res.status, msg, data });
    throw new Error(`${res.status} ${msg}`);
  }
  console.log("✅ API OK", { path, status: res.status, data });
  return data;
}