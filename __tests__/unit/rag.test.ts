import { cosineSimilarity } from '@/lib/rag/embeddings'
import { selectTopK, buildReferenceBlock, buildSources, type RetrievedChunk } from '@/lib/rag/retrieve'

describe('cosineSimilarity', () => {
  it('is 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1)
  })
  it('is 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
  })
  it('is -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 1], [-1, -1])).toBeCloseTo(-1)
  })
  it('returns 0 on length mismatch or empty input', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2])).toBe(0)
    expect(cosineSimilarity([], [])).toBe(0)
  })
  it('returns 0 when a vector is all zeros (avoids divide-by-zero)', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0)
  })
})

describe('selectTopK', () => {
  const index = [
    { id: 'a', embedding: [1, 0, 0] },
    { id: 'b', embedding: [0.9, 0.1, 0] },
    { id: 'c', embedding: [0, 1, 0] },
    { id: 'd', embedding: [0, 0, 1] },
  ]
  const query = [1, 0, 0]

  it('ranks by similarity and respects k', () => {
    const top = selectTopK(query, index, 2)
    expect(top.map(t => t.id)).toEqual(['a', 'b'])
  })
  it('scores are sorted descending', () => {
    const top = selectTopK(query, index, 4)
    for (let i = 1; i < top.length; i++) expect(top[i - 1].score).toBeGreaterThanOrEqual(top[i].score)
  })
  it('drops results below the minimum score', () => {
    const top = selectTopK(query, index, 4, 0.5)
    expect(top.map(t => t.id)).toEqual(['a', 'b']) // c and d are orthogonal (score 0)
  })
  it('returns [] for an empty index', () => {
    expect(selectTopK(query, [], 4)).toEqual([])
  })
})

const chunk = (id: string, n: number): RetrievedChunk => ({
  id,
  title: `Title ${n}`,
  source: 'NHS',
  url: `https://example.org/${id}`,
  tags: [],
  text: `Body text ${n}.`,
  score: 0.9 - n * 0.1,
})

describe('buildReferenceBlock', () => {
  it('returns empty string when there are no chunks', () => {
    expect(buildReferenceBlock([])).toBe('')
  })
  it('numbers references and includes title, source, url and text', () => {
    const block = buildReferenceBlock([chunk('migraine', 1), chunk('cold', 2)])
    expect(block).toContain('MEDICAL REFERENCE LIBRARY')
    expect(block).toContain('[1] Title 1 — Source: NHS (https://example.org/migraine)')
    expect(block).toContain('[2] Title 2')
    expect(block).toContain('Body text 1.')
    expect(block).toMatch(/cite it inline like \[1\]/)
  })
})

describe('buildSources', () => {
  it('maps chunks to numbered citation metadata', () => {
    const sources = buildSources([chunk('migraine', 1), chunk('cold', 2)])
    expect(sources).toEqual([
      { n: 1, id: 'migraine', title: 'Title 1', source: 'NHS', url: 'https://example.org/migraine' },
      { n: 2, id: 'cold', title: 'Title 2', source: 'NHS', url: 'https://example.org/cold' },
    ])
  })
  it('returns [] for no chunks', () => {
    expect(buildSources([])).toEqual([])
  })
})
