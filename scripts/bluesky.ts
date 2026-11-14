/*
 * Bluesky voor de promotie van Box1lab (zie promo/README.md). Zoekt Nederlandse posts waar Box1lab bij helpt, en
 * plaatst een reactie of bericht dat de eigenaar zelf heeft gekozen. Dit script schrijft zelf geen teksten.
 *
 * Inloggen met een app-wachtwoord (Bluesky: Instellingen → Privacy en beveiliging → App-wachtwoorden) in .env:
 *   BLUESKY_HANDLE=naam.bsky.social
 *   BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
 *
 * Gebruik:
 *   npm run bluesky -- zoek [uren]            posts van de laatste uren (standaard 48) die je nog niet zag
 *   npm run bluesky -- reageer <link> <tekst> reactie onder een post (link van bsky.app of at://-adres)
 *   npm run bluesky -- bericht <tekst>        eigen bericht
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PDS = "https://bsky.social/xrpc";
const pad = (relatief: string) => fileURLToPath(new URL(`../${relatief}`, import.meta.url));
const GEZIEN = pad("promo/.gezien.json");
const ZOEKTERMEN = pad("promo/zoektermen.txt");
const MAX_TEKENS = 300;

if (existsSync(pad(".env"))) process.loadEnvFile(pad(".env"));

interface Sessie {
  accessJwt: string;
  did: string;
}

interface Post {
  uri: string;
  cid: string;
  author: { handle: string; displayName?: string };
  record: { text: string; createdAt: string; reply?: { root: { uri: string; cid: string } } };
  likeCount?: number;
  replyCount?: number;
  repostCount?: number;
}

async function xrpc<T>(
  methode: string,
  sessie: Sessie | null,
  opties: { query?: Record<string, string>; body?: unknown } = {},
): Promise<T> {
  const url = new URL(`${PDS}/${methode}`);
  for (const [k, v] of Object.entries(opties.query ?? {})) url.searchParams.set(k, v);
  const antwoord = await fetch(url, {
    method: opties.body === undefined ? "GET" : "POST",
    headers: {
      ...(sessie ? { authorization: `Bearer ${sessie.accessJwt}` } : {}),
      ...(opties.body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: opties.body === undefined ? undefined : JSON.stringify(opties.body),
  });
  if (!antwoord.ok) throw new Error(`${methode}: ${antwoord.status} ${await antwoord.text()}`);
  return (await antwoord.json()) as T;
}

async function login(): Promise<Sessie> {
  const identifier = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_APP_PASSWORD;
  if (!identifier || !password) {
    throw new Error(
      "Zet BLUESKY_HANDLE en BLUESKY_APP_PASSWORD in .env (zie de uitleg bovenin scripts/bluesky.ts).",
    );
  }
  return xrpc<Sessie>("com.atproto.server.createSession", null, { body: { identifier, password } });
}

const webLink = (p: Post) => `https://bsky.app/profile/${p.author.handle}/post/${p.uri.split("/").pop()}`;

async function zoek(uren: number): Promise<void> {
  const sessie = await login();
  const termen = readFileSync(ZOEKTERMEN, "utf8")
    .split("\n")
    .map((r) => r.trim())
    .filter((r) => r && !r.startsWith("#"));
  const gezien = new Set<string>(
    existsSync(GEZIEN) ? (JSON.parse(readFileSync(GEZIEN, "utf8")) as string[]) : [],
  );
  const since = new Date(Date.now() - uren * 3600_000).toISOString();
  const gevonden = new Map<string, { post: Post; term: string }>();
  for (const term of termen) {
    const { posts } = await xrpc<{ posts: Post[] }>("app.bsky.feed.searchPosts", sessie, {
      query: { q: term, lang: "nl", sort: "latest", since, limit: "25" },
    });
    for (const post of posts) {
      if (post.author.handle === process.env.BLUESKY_HANDLE || gezien.has(post.uri) || gevonden.has(post.uri))
        continue;
      gevonden.set(post.uri, { post, term });
    }
  }
  const lijst = [...gevonden.values()].sort((a, b) =>
    b.post.record.createdAt.localeCompare(a.post.record.createdAt),
  );
  if (lijst.length === 0) console.log(`Geen nieuwe posts in de laatste ${uren} uur.`);
  lijst.forEach(({ post, term }, i) => {
    console.log(
      `--- ${i + 1} · @${post.author.handle} · ${post.record.createdAt.slice(0, 16).replace("T", " ")} UTC`,
    );
    console.log(`    ${post.likeCount ?? 0} likes, ${post.replyCount ?? 0} reacties · zoekterm "${term}"`);
    console.log(`    ${webLink(post)}`);
    console.log(post.record.text.replace(/^/gm, "    "));
  });
  writeFileSync(GEZIEN, JSON.stringify([...gezien, ...gevonden.keys()].slice(-5000)) + "\n");
}

/** Links klikbaar maken: Bluesky wil de plek van elke link in bytes (UTF-8). */
function facetten(tekst: string): unknown[] {
  const bytes = new TextEncoder();
  const uit: unknown[] = [];
  for (const m of tekst.matchAll(/https?:\/\/[^\s)]+[^\s).,!?]/g)) {
    const start = bytes.encode(tekst.slice(0, m.index)).length;
    uit.push({
      index: { byteStart: start, byteEnd: start + bytes.encode(m[0]).length },
      features: [{ $type: "app.bsky.richtext.facet#link", uri: m[0] }],
    });
  }
  return uit;
}

async function atUri(sessie: Sessie, link: string): Promise<string> {
  if (link.startsWith("at://")) return link;
  const m = /bsky\.app\/profile\/([^/]+)\/post\/([^/?#]+)/.exec(link);
  const [, wie, rkey] = m ?? [];
  if (!wie || !rkey) throw new Error(`Geen Bluesky-link: ${link}`);
  const did = wie.startsWith("did:")
    ? wie
    : (await xrpc<{ did: string }>("com.atproto.identity.resolveHandle", sessie, { query: { handle: wie } }))
        .did;
  return `at://${did}/app.bsky.feed.post/${rkey}`;
}

async function plaats(tekst: string, ouderLink?: string): Promise<void> {
  const lengte = [...new Intl.Segmenter().segment(tekst)].length;
  if (lengte > MAX_TEKENS)
    throw new Error(`De tekst is ${lengte} tekens; Bluesky staat er ${MAX_TEKENS} toe.`);
  const sessie = await login();
  let reply: unknown;
  if (ouderLink) {
    const uri = await atUri(sessie, ouderLink);
    const { posts } = await xrpc<{ posts: Post[] }>("app.bsky.feed.getPosts", sessie, {
      query: { uris: uri },
    });
    const ouder = posts[0];
    if (!ouder) throw new Error(`Post niet gevonden: ${ouderLink}`);
    reply = {
      root: ouder.record.reply?.root ?? { uri: ouder.uri, cid: ouder.cid },
      parent: { uri: ouder.uri, cid: ouder.cid },
    };
  }
  const record = {
    $type: "app.bsky.feed.post",
    text: tekst,
    createdAt: new Date().toISOString(),
    langs: ["nl"],
    facets: facetten(tekst),
    ...(reply ? { reply } : {}),
  };
  const { uri } = await xrpc<{ uri: string }>("com.atproto.repo.createRecord", sessie, {
    body: { repo: sessie.did, collection: "app.bsky.feed.post", record },
  });
  console.log(
    `Geplaatst: https://bsky.app/profile/${process.env.BLUESKY_HANDLE}/post/${uri.split("/").pop()}`,
  );
}

const [opdracht, ...rest] = process.argv.slice(2);
if (opdracht === "zoek") await zoek(Number(rest[0] ?? 48));
else if (opdracht === "reageer" && rest.length >= 2) await plaats(rest.slice(1).join(" "), rest[0]);
else if (opdracht === "bericht" && rest.length >= 1) await plaats(rest.join(" "));
else {
  console.log("Gebruik: npm run bluesky -- zoek [uren] | reageer <link> <tekst> | bericht <tekst>");
  process.exitCode = 1;
}
