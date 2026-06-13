/**
 * Embeds the knowledge corpus and writes data/knowledge/embeddings.json.
 *
 * Usage:  npm run ingest
 * Needs:  OPENAI_API_KEY in .env.local (makes real embedding API calls — cheap,
 *         a few cents for the whole corpus).
 *
 * Run this once (and again whenever you edit data/knowledge/corpus.ts), then
 * commit the regenerated embeddings.json so it deploys with the app.
 */
import fs from 'fs'
import path from 'path'

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const p = path.join(process.cwd(), file)
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}
loadEnv()

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('✗ OPENAI_API_KEY not found in .env.local — cannot embed the corpus.')
    process.exit(1)
  }

  const { CORPUS } = await import('../data/knowledge/corpus')
  const { embedText } = await import('../lib/rag/embeddings')

  console.log(`\nEmbedding ${CORPUS.length} reference documents…\n`)
  const records: { id: string; embedding: number[] }[] = []

  for (const doc of CORPUS) {
    process.stdout.write(`  • ${doc.id.padEnd(22)} `)
    try {
      // Embed title + text so topic words and body both inform the vector.
      const embedding = await embedText(`${doc.title}\n${doc.text}`)
      records.push({ id: doc.id, embedding })
      console.log(`✓ (${embedding.length} dims)`)
    } catch (err: any) {
      console.log(`✗ ${err.message}`)
    }
  }

  const outPath = path.join(process.cwd(), 'data', 'knowledge', 'embeddings.json')
  fs.writeFileSync(outPath, JSON.stringify(records))
  console.log(`\n✓ Wrote ${records.length} embeddings → data/knowledge/embeddings.json`)
  console.log('  Commit this file so retrieval works on deploy.\n')
}

main().catch(err => { console.error(err); process.exit(1) })
