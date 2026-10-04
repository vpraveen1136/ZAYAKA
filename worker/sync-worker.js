/**
 * ZAYAKA Cloudflare Worker / Serverless Sync Proxy
 * 
 * Secure micro-service that keeps GitHub Personal Access Tokens out of the frontend code.
 * Deploy this tiny worker on Cloudflare Workers (free tier) or Vercel, and set environment variables:
 * - GITHUB_TOKEN (Personal Access Token with repo write permissions)
 * - GITHUB_OWNER (e.g., your GitHub username or organization)
 * - GITHUB_REPO (e.g., zayaka)
 * - GITHUB_BRANCH (default: main)
 * - ACCESS_CODE (BAWARCHI)
 */

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Access-Code'
        }
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Verify lightweight editor access code independently using SHA-256
    const rawAccess = (request.headers.get('X-Access-Code') || '').trim().toUpperCase();
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawAccess));
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

    const expectedHash = env.EDITOR_CODE_HASH || 'b807040a60f02e4202511469f1a1715aeb626261c2ee9bb3952875e648e202cd';
    if (hashHex !== expectedHash) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid editor credential' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    try {
      const body = await request.json();
      const { action, recipes, categories } = body;

      if (action !== 'write') {
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const token = env.GITHUB_TOKEN;
      const owner = env.GITHUB_OWNER;
      const repo = env.GITHUB_REPO;
      const branch = env.GITHUB_BRANCH || 'main';

      if (!token || !owner || !repo) {
        return new Response(
          JSON.stringify({ error: 'Worker environment variables (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO) not configured.' }),
          { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }

      // Helper to commit a file with optimistic concurrency
      async function commitFile(path, contentObj, commitMessage) {
        const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
        const getRes = await fetch(getUrl, {
          headers: {
            Authorization: `token ${token}`,
            'User-Agent': 'Zayaka-Sync-Worker',
            Accept: 'application/vnd.github.v3+json'
          }
        });

        let currentSha = undefined;
        if (getRes.ok) {
          const fileInfo = await getRes.json();
          currentSha = fileInfo.sha;
        }

        const jsonStr = JSON.stringify(contentObj, null, 2);
        // Base64 encode UTF-8
        const utf8Bytes = new TextEncoder().encode(jsonStr);
        let binary = '';
        for (let i = 0; i < utf8Bytes.length; i++) {
          binary += String.fromCharCode(utf8Bytes[i]);
        }
        const base64 = btoa(binary);

        const putRes = await fetch(getUrl, {
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
            sha: currentSha,
            branch
          })
        });

        if (!putRes.ok) {
          const errText = await putRes.text();
          throw new Error(`GitHub commit failed for ${path}: ${errText}`);
        }
      }

      if (recipes) {
        await commitFile('data/recipes.json', recipes, 'Update recipe catalogue via ZAYAKA Worker');
      }

      if (categories) {
        await commitFile('data/categories.json', categories, 'Update categories via ZAYAKA Worker');
      }

      return new Response(JSON.stringify({ success: true, timestamp: new Date().toISOString() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};
