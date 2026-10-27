import { describe, expect, it } from 'vitest'
import { filterRecorderBody } from './analytics'

describe('filterRecorderBody', () => {
	it('redacts every heatmap URL', () => {
		const body = JSON.stringify({
			type: 'heatmap',
			payload: {
				website: 'w',
				events: [
					{ type: 'click', url: 'https://kreditozrouti.cz/s/secret?x=1#y', x: 1, y: 2 },
					{ type: 'scroll', url: 'https://kreditozrouti.cz/courses?q=abc', scrollPct: 50 }
				]
			}
		})
		const sent = JSON.parse(filterRecorderBody(body) ?? 'null') as { payload: { website: string; events: { url: string }[] } }
		expect(sent.payload.website).toBe('w')
		expect(sent.payload.events.map(event => event.url)).toEqual(['https://kreditozrouti.cz/s/[id]', 'https://kreditozrouti.cz/courses'])
	})

	it('drops a session replay and anything unreadable', () => {
		expect(filterRecorderBody(JSON.stringify({ type: 'record', payload: { events: [{ type: 4, data: { href: '/s/secret' } }] } }))).toBeNull()
		expect(filterRecorderBody('not json')).toBeNull()
		expect(filterRecorderBody(JSON.stringify({ type: 'heatmap', payload: {} }))).toBeNull()
	})
})
