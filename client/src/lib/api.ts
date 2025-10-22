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
  
  // 401 에러 발생시 토큰 재발급 시도
  if (res.status === 401 && auth && url !== '/api/auth/generate-token') {
    try {
      // 새 토큰 발급
      const tokenResponse = await fetch('/api/auth/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        if (tokenData.token) {
          // localStorage에 새 토큰 저장
          localStorage.setItem('token', tokenData.token);
          
          // 새 토큰으로 원래 요청 재시도
          const newHeaders: HeadersInit = { ...headers };
          newHeaders["Authorization"] = `Bearer ${tokenData.token}`;
          
          const retryOptions: RequestInit = {
            ...fetchOptions,
            headers: newHeaders
          };
          
          const retryRes = await fetch(url, retryOptions);
          const retryCt = retryRes.headers.get("content-type") || "";
          const retryOut = retryCt.includes("application/json") ? await retryRes.json().catch(()=>null) : await retryRes.text().catch(()=>null);
          if (!retryRes.ok) throw new Error(typeof retryOut === "string" ? `${retryRes.status} ${retryOut}` : (retryOut?.message || `${retryRes.status}`));
          return retryOut;
        }
      }
    } catch (error) {
      console.error('토큰 재발급 실패:', error);
      // 재발급 실패시 원래 401 에러 처리로 진행
    }
  }
  
  const ct = res.headers.get("content-type") || "";
  const out = ct.includes("application/json") ? await res.json().catch(()=>null) : await res.text().catch(()=>null);
  if (!res.ok) throw new Error(typeof out === "string" ? `${res.status} ${out}` : (out?.message || `${res.status}`));
  return out;
}
