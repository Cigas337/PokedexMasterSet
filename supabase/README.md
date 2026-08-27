# Pokédex M7 — backend Web Push

Código de produção da fase Push publicada em 27/08/2026.

## Funções

- `push-subscriptions`: devolve apenas a chave pública VAPID e regista/desativa subscrições por dispositivo.
- `stock-push-worker`: consulta o feed PokéStockPT, deteta novo stock/reposição/pré-venda e envia Web Push. Inclui `mode: "test"` para validação administrativa.

As duas funções usam `verify_jwt = false` de forma intencional:

- `push-subscriptions` valida a origem GitHub Pages e uma chave publicável Supabase;
- `stock-push-worker` exige o cabeçalho privado `x-cron-secret`.

## Produção

- Projeto: `wdljzuqoftrontqhhatr` (Pokédex M7)
- Cron: `*/5 * * * *`
- Service Worker: `/sw.js`
- Site: https://cigas337.github.io/PokedexMasterSet/

## Segredos

Nunca colocar no GitHub:

- `SUPABASE_SERVICE_ROLE_KEY`
- chave VAPID privada
- `cron_secret`

A chave `sb_publishable_` existente no frontend não é um segredo; a autorização de dados continua protegida por RLS e pela Edge Function.
