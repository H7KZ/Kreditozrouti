import DOMPurify from 'dompurify'
import { marked } from 'marked'

/**
 * Render untrusted markdown/text (e.g. scraped InSIS syllabus fields) to a safe
 * HTML string for use in `v-html`.
 *
 * `marked` does not sanitize its output and passes raw HTML through untouched,
 * so scraped content like `<img src=x onerror=alert(1)>` would execute. Every
 * value rendered via `v-html` must therefore go through DOMPurify first. This is
 * the single sanctioned markdown-to-HTML sink for the client.
 */
export function renderMarkdown(value: string): string {
	if (!value) return ''
	const html = marked.parse(value, { async: false })
	return DOMPurify.sanitize(html)
}
