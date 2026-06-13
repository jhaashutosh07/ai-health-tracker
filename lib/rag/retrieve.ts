import { CORPUS, type KnowledgeDoc } from '@/data/knowledge/corpus'
import { loadEmbeddingIndex, type EmbeddingRecord } from './store'
import { cosineSimilarity, embedText } from './embeddings'

export interface RetrievedChunk extends KnowledgeDoc {
  score: number
}

export interface Source {
  n: number
  id: string
  title: string
  source: string
  url: string
}

// Pure ranking: cosine-rank an index against a query embedding, keep the top-k
// above a minimum score. Unit-tested.
export function selectTopK(
  queryEmbedding: number[],
  index: EmbeddingRecord[],
  k: number,
  minScore = 0
): { id: string; score: number }[] {
  return index
    .map(r => ({ id: r.id, score: cosineSimilarity(queryEmbedding, r.embedding) }))
    .filter(r => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}

// Embed the query and return the most relevant corpus chunks. Returns [] (no
// augmentation) when the index is empty, the query is blank, or embedding fails.
export async function retrieveContext(query: string, k = 4, minScore = 0.25): Promise<RetrievedChunk[]> {
  const index = loadEmbeddingIndex()
  if (!index.length || !query?.trim()) return []

  let q: number[]
  try {
    q = await embedText(query)
  } catch {
    return []
  }

  const byId = new Map(CORPUS.map(d => [d.id, d]))
  return selectTopK(q, index, k, minScore)
    .map(r => {
      const doc = byId.get(r.id)
      return doc ? { ...doc, score: r.score } : null
    })
    .filter((c): c is RetrievedChunk => c !== null)
}

// Reference block injected into the system prompt; instructs inline [n] citing.
export function buildReferenceBlock(chunks: RetrievedChunk[]): string {
  if (!chunks.length) return ''
  const refs = chunks
    .map((c, i) => `[${i + 1}] ${c.title} — Source: ${c.source}${c.url ? ` (${c.url})` : ''}\n${c.text}`)
    .join('\n\n')
  return (
    'MEDICAL REFERENCE LIBRARY (curated, trusted sources). When you state a general medical ' +
    'fact that comes from these references, cite it inline like [1]. Only cite from this list; ' +
    'never invent a source. If the references do not cover the question, answer from general ' +
    'knowledge without a citation.\n\n' +
    refs
  )
}

// Structured citation list returned to the client for display.
export function buildSources(chunks: RetrievedChunk[]): Source[] {
  return chunks.map((c, i) => ({ n: i + 1, id: c.id, title: c.title, source: c.source, url: c.url }))
}
