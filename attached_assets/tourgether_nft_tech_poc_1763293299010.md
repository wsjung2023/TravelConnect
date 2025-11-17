
# Tourgether NFT PoC 기술 설계서 (tourgether_nft_tech_poc.md)

작성일: 2025-11-16  
버전: v0.1 (PoC)  
대상: 투어게더 기존 프로토타입(지도/피드/채팅/프로필) 기반으로 NFT 기능을 “위에 얹어서” 붙일 개발자/기획자

---

## 0. PoC 목표

**기존 투어게더 프로토타입(React SPA + Supabase 기반)을 유지한 상태에서**,  
아래 기능만 최소로 추가하는 기술 설계:

1. 프로필 화면에서 **지갑 연결** 기능 제공
2. 백엔드에서 **해당 지갑이 특정 NFT(A_NFT)를 몇 개 들고 있는지 온체인 조회**
3. 보유 개수에 따라 **티어(`normal/bronze/silver/legend`) 계산**
4. 프로필 화면에서 **내 NFT 개수 + 내 티어를 보여주고**,  
   티어에 따라 다른 메시지/버튼을 노출

> 단일 크리에이터 + 단일 컬렉션 + 단일 `tokenId` 기준 PoC  
> (예: `contractAddress = "0x1234..."`, `tokenId = 1`)

---

## 1. 현재 투어게더 구조 전제

### 1.1 프론트엔드 (이미 존재)

- Replit에서 동작하는 **React 기반 SPA/PWA**
- 메인 화면:
  - 지도 중심 메인(“Tourgether Map”)
  - 하단 탭: `지도 / 피드 / 채팅 / 프로필`
- `ProfilePage` 또는 유사한 컴포넌트에서
  - 사용자 정보, 설정, 로그아웃 등 표시

### 1.2 백엔드/데이터 (이미 존재 가정)

- Supabase (PostgreSQL + Auth) 사용 중
- 최소 테이블:
  - `users` (uuid 기반 사용자 ID)
- Supabase Auth로 로그인/유저 인증 처리

### 1.3 이번 설계 방향

- **기존 구조를 그대로 유지**하고,
- Supabase에 **테이블 2~3개 추가**
- Supabase Edge Functions(또는 RPC)을 이용해
  - 온체인 조회 + 티어 계산 API 구현
- 프론트는 **기존 Profile 페이지에 새로운 섹션만 추가**

---

## 2. DB 설계 (Supabase / Postgres)

### 2.1 기존 (예상)

```sql
-- 이미 존재한다고 가정
create table users (
  id uuid primary key,
  email text,
  nickname text,
  created_at timestamptz default now()
);
```

### 2.2 새로 추가: 지갑 테이블

**목적:**  
유저 계정과 블록체인 지갑 주소를 연결.

```sql
create table user_wallets (
  id          bigserial primary key,
  user_id     uuid references users(id) on delete cascade,
  address     text not null,
  chain       text not null default 'polygon',
  is_primary  boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 한 유저당 체인별 primary 지갑 1개만 허용 (PoC 기준)
create unique index ux_user_wallets_user_chain_primary
  on user_wallets(user_id, chain)
  where is_primary = true;
```

### 2.3 새로 추가: NFT 글로벌 설정 테이블

**목적:**  
PoC에서 사용할 A_NFT의 기본 정보를 저장.

```sql
create table nft_global_settings (
  id               bigserial primary key,
  name             text not null,      -- 예: 'Tourgether A NFT'
  chain            text not null,      -- 예: 'polygon'
  contract_address text not null,
  token_id         numeric not null,   -- ERC-1155 기준
  tier_rules_json  jsonb not null,     -- 예: { "normal":0,"bronze":1,"silver":5,"legend":10 }
  created_at       timestamptz not null default now()
);
```

> Phase 1에서는 이 테이블에 **레코드 1개만 사용** (단일 NFT 컬렉션)

### 2.4 (옵션) NFT 상태 스냅샷 테이블

**목적:**  
온체인 조회 결과를 캐시/분석용으로 저장.

```sql
create table user_nft_status_snapshots (
  id             bigserial primary key,
  user_id        uuid references users(id) on delete cascade,
  wallet_address text not null,
  balance        numeric not null,
  tier           text not null,
  snapshot_at    timestamptz not null default now()
);
```

- 실제 권한/티어의 소스 오브 트루스는 **온체인 balance + 룰**이고,
- 이 테이블은 “최근 상태 로그”로 사용.

---

## 3. 티어 규칙 (Phase 1 고정 룰)

NFT 보유 개수에 따른 티어:

- `0`개 → `normal`
- `1~4`개 → `bronze`
- `5~9`개 → `silver`
- `10개 이상` → `legend`

`nft_global_settings.tier_rules_json` 예시:

```json
{
  "normal": 0,
  "bronze": 1,
  "silver": 5,
  "legend": 10
}
```

서버에서 이 룰에 따라 if-else로 티어 결정.

---

## 4. Edge Function 설계 (Supabase 기준)

### 4.1 함수 1: 지갑 연결 (`connect_wallet`)

**역할:**  
프론트에서 MetaMask로 받은 지갑 주소를 DB에 저장.

#### HTTP 인터페이스

- Path: `/functions/v1/connect_wallet`
- Method: `POST`
- 헤더:
  - `Authorization: Bearer <supabase_access_token>`
- Body (JSON):

```json
{
  "address": "0xAbC123...",
  "chain": "polygon"
}
```

#### 의사코드 (TypeScript 스타일)

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const body = await req.json();
  const address = body.address;
  const chain = body.chain ?? "polygon";

  if (!address) {
    return new Response(JSON.stringify({ error: "address required" }), { status: 400 });
  }

  // upsert: user_id + chain 기준으로 primary 지갑 1개 유지
  const { error } = await supabase
    .from("user_wallets")
    .upsert({
      user_id: user.id,
      address,
      chain,
      is_primary: true
    }, {
      onConflict: "user_id,chain"
    });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, address, chain }), {
    headers: { "Content-Type": "application/json" }
  });
});
```

---

### 4.2 함수 2: NFT 상태 조회 (`get_nft_status`)

**역할:**  
- 로그인된 유저의 기본 지갑을 찾고,
- NFT 설정값을 읽어서,
- 온체인에서 `balanceOf` 조회,
- 티어 계산 후 JSON 반환.

#### HTTP 인터페이스

- Path: `/functions/v1/get_nft_status`
- Method: `GET`
- 헤더:
  - `Authorization: Bearer <supabase_access_token>`

#### 응답 예시

```json
{
  "wallet_address": "0xAbC123...",
  "chain": "polygon",
  "balance": 7,
  "tier": "silver",
  "tier_rules": {
    "normal": 0,
    "bronze": 1,
    "silver": 5,
    "legend": 10
  }
}
```

#### 의사코드 (TypeScript 스타일)

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6";

const RPC_URL = Deno.env.get("POLYGON_RPC_URL")!;
const provider = new ethers.JsonRpcProvider(RPC_URL);

const ERC1155_ABI = [
  "function balanceOf(address account, uint256 id) view returns (uint256)"
];

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  // 1) 유저 인증
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  // 2) 유저 기본 지갑 조회
  const { data: wallet, error: walletError } = await supabase
    .from("user_wallets")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_primary", true)
    .single();

  if (walletError || !wallet) {
    // 지갑이 없으면 기본 normal 티어
    return new Response(JSON.stringify({
      wallet_address: null,
      chain: null,
      balance: 0,
      tier: "normal",
      tier_rules: null
    }), { headers: { "Content-Type": "application/json" } });
  }

  // 3) NFT 글로벌 설정 조회 (PoC: 첫 레코드만 사용)
  const { data: setting, error: settingError } = await supabase
    .from("nft_global_settings")
    .select("*")
    .limit(1)
    .single();

  if (settingError || !setting) {
    return new Response(JSON.stringify({ error: "NFT not configured" }), { status: 500 });
  }

  // 4) 온체인 balance 조회
  const contract = new ethers.Contract(setting.contract_address, ERC1155_ABI, provider);
  const rawBalance = await contract.balanceOf(wallet.address, setting.token_id);
  const balance = Number(rawBalance);

  // 5) 티어 계산
  const rules = setting.tier_rules_json as {
    normal: number;
    bronze: number;
    silver: number;
    legend: number;
  };

  let tier = "normal";
  if (balance >= rules.legend) tier = "legend";
  else if (balance >= rules.silver) tier = "silver";
  else if (balance >= rules.bronze) tier = "bronze";

  // 6) (옵션) 스냅샷 저장
  await supabase.from("user_nft_status_snapshots").insert({
    user_id: user.id,
    wallet_address: wallet.address,
    balance,
    tier
  });

  // 7) 응답
  return new Response(JSON.stringify({
    wallet_address: wallet.address,
    chain: wallet.chain,
    balance,
    tier,
    tier_rules: rules
  }), { headers: { "Content-Type": "application/json" } });
});
```

---

## 5. 프론트엔드 통합 (기존 Profile 페이지에 섹션 추가)

### 5.1 Profile 페이지에 추가할 컴포넌트 개념

두 개 섹션을 추가:

1. `WalletSection` – 지갑 연결/표시
2. `NftStatusSection` – 내 NFT 개수/티어 표시

### 5.2 WalletSection 예시 (React)

```tsx
import { useState } from "react";

export function WalletSection() {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function connect() {
    try {
      // @ts-ignore
      const { ethereum } = window;
      if (!ethereum) {
        alert("메타마스크(또는 Web3 지갑)가 필요합니다.");
        return;
      }

      setLoading(true);
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const addr = accounts[0];

      // Supabase Edge Function 호출 (proxy 설정 전제)
      await fetch("/functions/v1/connect_wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
          // Authorization 헤더는 공통 fetch 래퍼에서 자동 추가하는 것이 이상적
        },
        body: JSON.stringify({ address: addr, chain: "polygon" })
      });

      setAddress(addr);
    } catch (e) {
      console.error(e);
      alert("지갑 연결 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ marginTop: 16 }}>
      <h3>지갑 연결</h3>
      {address ? (
        <p>연결된 지갑: {address}</p>
      ) : (
        <button onClick={connect} disabled={loading}>
          {loading ? "연결 중..." : "MetaMask 지갑 연결하기"}
        </button>
      )}
    </section>
  );
}
```

> 실제 앱에서는 **Supabase에서 가져온 기존 주소**를 먼저 보여주고, 없을 때만 버튼을 보여주는 구조로 조정 가능.

### 5.3 NftStatusSection 예시 (React)

```tsx
import { useEffect, useState } from "react";

type NftStatus = {
  wallet_address: string | null;
  chain: string | null;
  balance: number;
  tier: "normal" | "bronze" | "silver" | "legend";
  tier_rules: {
    normal: number;
    bronze: number;
    silver: number;
    legend: number;
  } | null;
};

export function NftStatusSection() {
  const [status, setStatus] = useState<NftStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/functions/v1/get_nft_status", {
          headers: {
            // Authorization 헤더는 공통 래퍼 또는 Supabase client가 처리
          }
        });
        const data = await res.json();
        setStatus(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <section>멤버십 정보를 불러오는 중...</section>;
  if (!status) return <section>멤버십 정보를 가져올 수 없습니다.</section>;

  return (
    <section style={{ marginTop: 16 }}>
      <h3>투어게더 NFT 멤버십</h3>
      <p>지갑: {status.wallet_address ?? "연결된 지갑 없음"}</p>
      <p>보유 NFT 개수: {status.balance}</p>
      <p>내 티어: {status.tier}</p>

      {status.tier === "legend" && (
        <p>🔥 레전드 티어입니다. VIP 전용 혜택이 열립니다.</p>
      )}
      {status.tier === "silver" && (
        <p>⭐ 실버 티어입니다. 우선 예약 등 일부 프리미엄 기능 이용 가능.</p>
      )}
      {status.tier === "bronze" && (
        <p>브론즈 티어입니다. 첫 클럽 멤버십을 얻으셨습니다.</p>
      )}
      {status.tier === "normal" && (
        <p>NFT를 획득하면 더 많은 여행 혜택이 열립니다.</p>
      )}
    </section>
  );
}
```

### 5.4 ProfilePage에 통합

```tsx
import { WalletSection } from "./WalletSection";
import { NftStatusSection } from "./NftStatusSection";

export function ProfilePage() {
  const user = useCurrentUser(); // 기존 훅/컨텍스트 사용

  return (
    <div>
      <Header title="프로필" />
      <UserInfoSection user={user} />

      {/* 새로 추가된 섹션들 */}
      <WalletSection />
      <NftStatusSection />

      <MenuList />
    </div>
  );
}
```

---

## 6. Phase 1 WBS (작업 쪼개기)

### 6.1 DB 작업

1. `user_wallets` 테이블 생성
2. `nft_global_settings` 테이블 생성 + A_NFT 정보 1 row 입력
3. (옵션) `user_nft_status_snapshots` 테이블 생성

### 6.2 Edge Functions

1. `connect_wallet` 함수 생성
   - Supabase auth 연동
   - `user_wallets` upsert
2. `get_nft_status` 함수 생성
   - Supabase auth 연동
   - `user_wallets`에서 지갑 조회
   - `nft_global_settings`에서 설정 조회
   - Ethers.js로 `balanceOf` 호출
   - 티어 계산 및 응답
   - (옵션) 스냅샷 저장

### 6.3 프론트엔드

1. `WalletSection` 컴포넌트 추가
2. `NftStatusSection` 컴포넌트 추가
3. `ProfilePage`에 두 컴포넌트 포함
4. 환경변수/프록시 설정 (Replit → Supabase Edge Functions 호출 경로 정리)
5. 기본 UI 스타일링 (투어게더 기존 스타일과 맞추기)

---

## 7. 이후 확장 방향 (다음 단계에서 다룰 것)

- 크리에이터 전용:
  - NFT 컬렉션 발행 신청
  - 발행 자격 체크(리뷰/신뢰도)
  - 발행 수수료 결제/로깅
- Dynamic NFT:
  - 보유 기간/거래 횟수에 따른 메타데이터 변경 설계
- 상품/투어 옵션과 연동:
  - “NFT 홀더 전용 옵션” 설정
  - 예약/결제 시 티어 체크

> 이 문서는 **기존 투어게더 프로토타입에 NFT 티어 시스템을 “최소 침습 방식”으로 얹기 위한 PoC 설계서**이며,  
> 실제 구현 과정에서 파일 구조/이름/스타일은 프로젝트 상황에 맞게 조정 가능하다.
