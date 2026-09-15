// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
	it('renders basic markdown to HTML', () => {
		const html = renderMarkdown('**bold** and *italic*')
		expect(html).toContain('<strong>bold</strong>')
		expect(html).toContain('<em>italic</em>')
	})

	it('renders links generated from markdown', () => {
		const html = renderMarkdown('[VSE](https://vse.cz)')
		expect(html).toContain('href="https://vse.cz"')
	})

	it('strips an img onerror payload but keeps the safe attributes', () => {
		const html = renderMarkdown('<img src=x onerror=alert(1)>')
		expect(html).not.toContain('onerror')
		expect(html).not.toContain('alert(1)')
	})

	it('strips inline script tags from raw HTML', () => {
		const html = renderMarkdown('before <script>alert(1)</script> after')
		expect(html).not.toContain('<script>')
		expect(html).not.toContain('alert(1)')
	})

	it('strips javascript: URLs from anchors', () => {
		const html = renderMarkdown('[click](javascript:alert(1))')
		expect(html).not.toContain('javascript:')
	})

	it('strips event handlers injected via raw HTML anchors', () => {
		const html = renderMarkdown('<a href="#" onclick="alert(1)">x</a>')
		expect(html).not.toContain('onclick')
	})

	it('returns an empty string for empty input', () => {
		expect(renderMarkdown('')).toBe('')
	})
})
