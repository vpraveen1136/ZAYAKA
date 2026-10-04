/**
 * ZAYAKA Cloudflare Worker / Serverless Sync Proxy
 * 
 * Secure micro-service that keeps GitHub Personal Access Tokens out of the frontend code.
 * The PWA communicates with this worker, and the worker performs authenticated GitHub API reads and writes.
 * 
 * Environment variables configured in Cloudflare Worker:
 * - GITHUB_TOKEN (Personal Access Token with repo write permissions)
 * - GITHUB_OWNER (e.g., vpraveen1136)
 * - GITHUB_REPO (e.g., ZAYAKA)
 * - GITHUB_BRANCH (default: main)
 * - EDITOR_CODE_HASH (SHA-256 of BAWARCHI: b807040a60f02e4202511469f1a1715aeb626261c2ee9bb3952875e648e202cd)
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Access-Code, If-None-Match, Cache-Control'
    };

    // 1. Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'ZAYAKA Sync Worker',
          repo: `${env.GITHUB_OWNER || ''}/${env.GITHUB_REPO || ''}`,
          configured: Boolean(env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_REPO)
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = env.GITHUB_TOKEN;
    const owner = env.GITHUB_OWNER;
    const repo = env.GITHUB_REPO;
    const branch = env.GITHUB_BRANCH || 'main';

    if (!token || !owner || !repo) {
      return new Response(
        JSON.stringify({
          error: 'Worker environment variables (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO) are not configured.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper to fetch file from GitHub Contents API
    async function getGitHubFile(path) {
      const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}&t=${Date.now()}`;
      const res = await fetch(getUrl, {
        headers: {
          Authorization: `token ${token}`,
          'User-Agent': 'Zayaka-Sync-Worker',
          Accept: 'application/vnd.github.v3+json'
        }
      });

      if (!res.ok) {
        if (res.status === 404) return null;
        const err = await res.text();
        throw new Error(`Failed to fetch ${path} from GitHub: ${err}`);
      }

      const data = await res.json();
      // Decode Base64 content to UTF-8 string
      const rawContent = atob(data.content.replace(/\n/g, ''));
      const bytes = new Uint8Array(rawContent.length);
      for (let i = 0; i < rawContent.length; i++) {
        bytes[i] = rawContent.charCodeAt(i);
      }
      const jsonText = new TextDecoder('utf-8').decode(bytes);

      return {
        sha: data.sha,
        data: JSON.parse(jsonText)
      };
    }

    // 2. Handle Read Operations (GET / or POST { action: 'read' })
    if (request.method === 'GET' || (request.method === 'POST' && url.searchParams.get('action') === 'read')) {
      try {
        const [recipesInfo, categoriesInfo] = await Promise.all([
          getGitHubFile('data/recipes.json'),
          getGitHubFile('data/categories.json')
        ]);

        return new Response(
          JSON.stringify({
            recipes: recipesInfo?.data || [],
            categories: categoriesInfo?.data || [],
            sha: {
              recipes: recipesInfo?.sha,
              categories: categoriesInfo?.sha
            },
            timestamp: new Date().toISOString()
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ error: err.message || String(err) }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. Handle Write Operations (POST)
    if (request.method === 'POST') {
      // Independent Editor Authorization Enforcement (Requirement 14, 15, 16)
      const rawAccess = (request.headers.get('X-Access-Code') || '').trim().toUpperCase();
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawAccess));
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

      const expectedHash = env.EDITOR_CODE_HASH || 'b807040a60f02e4202511469f1a1715aeb626261c2ee9bb3952875e648e202cd';
      if (hashHex !== expectedHash) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Valid Editor access code required for write operations.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const body = await request.json();
        const { action, recipes, categories, expectedSha } = body;

        if (action === 'read') {
          const [recipesInfo, categoriesInfo] = await Promise.all([
            getGitHubFile('data/recipes.json'),
            getGitHubFile('data/categories.json')
          ]);

          return new Response(
            JSON.stringify({
              recipes: recipesInfo?.data || [],
              categories: categoriesInfo?.data || [],
              sha: { recipes: recipesInfo?.sha, categories: categoriesInfo?.sha },
              timestamp: new Date().toISOString()
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (action !== 'write') {
          return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Helper to commit a file with optimistic concurrency
        async function commitFile(path, contentObj, commitMessage, expectedFileSha) {
          const currentFile = await getGitHubFile(path);
          const currentSha = currentFile?.sha;

          // Optimistic Concurrency check
          if (expectedFileSha && currentSha && expectedFileSha !== currentSha) {
            throw new Error(`Conflict detected on ${path}: Remote file was updated by another editor. Please refresh.`);
          }

          const jsonStr = JSON.stringify(contentObj, null, 2);
          const utf8Bytes = new TextEncoder().encode(jsonStr);
          let binary = '';
          for (let i = 0; i < utf8Bytes.length; i++) {
            binary += String.fromCharCode(utf8Bytes[i]);
          }
          const base64 = btoa(binary);

          const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
          const putRes = await fetch(putUrl, {
            method: 'PUT',
            headers: {
              Authorization: `token ${token}`,
              'User-Agent': 'Zayaka-Sync-Worker',
              'Content-Type': 'application/json',
              Accept: 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
              message: commitMessage,
              content: base64,
              sha: currentSha || undefined,
              branch
            })
          });

          if (!putRes.ok) {
            if (putRes.status === 409) {
              throw new Error(`Conflict detected: ${path} was concurrently updated on GitHub. Please refresh.`);
            }
            const errText = await putRes.text();
            throw new Error(`GitHub commit failed for ${path} (${putRes.status}): ${errText}`);
          }

          const putResult = await putRes.json();
          return putResult?.content?.sha;
        }

        const newShas = {};

        if (recipes) {
          newShas.recipes = await commitFile(
            'data/recipes.json',
            recipes,
            'Update recipes catalogue via ZAYAKA PWA',
            expectedSha?.recipes
          );
        }

        if (categories) {
          newShas.categories = await commitFile(
            'data/categories.json',
            categories,
            'Update categories via ZAYAKA PWA',
            expectedSha?.categories
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            sha: newShas,
            timestamp: new Date().toISOString(),
            message: 'Changes written to GitHub successfully.'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        const isConflict = err.message && err.message.includes('Conflict');
        return new Response(
          JSON.stringify({ error: err.message || String(err), conflict: isConflict }),
          { status: isConflict ? 409 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }
};
