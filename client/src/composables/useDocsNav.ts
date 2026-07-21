import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'

export type DocFrontMatter = {
	title?: string
	section?: string
	order?: number
}

export type NavItem = {
	title: string
	path: string
	active: boolean
}

export type NavSection = {
	label: string
	items: NavItem[]
	minOrder: number
}

export type NavTree = {
	topLevel: NavItem[]
	sections: NavSection[]
}

export function filePathToRoute(filePath: string): string {
	// '../pages/docs/en/faq.md' -> '/docs/en/faq'
	return filePath.replace(/^\.\.\/pages/, '').replace(/\.md$/, '')
}

type RankedItem = NavItem & { order: number }

export function buildNavTree(pages: Record<string, DocFrontMatter>, currentPath: string, locale: string): NavTree {
	const topLevel: RankedItem[] = []
	const sectionMap = new Map<string, { items: RankedItem[]; minOrder: number }>()

	for (const [filePath, fm] of Object.entries(pages)) {
		if (!filePath.includes(`/docs/${locale}/`)) continue

		const path = filePathToRoute(filePath)
		const title = fm.title ?? path.split('/').at(-1) ?? path
		const order = fm.order ?? 999
		const item: RankedItem = { title, path, active: currentPath === path, order }

		const section = fm.section?.trim()
		if (section) {
			const existing = sectionMap.get(section)
			if (existing) {
				existing.items.push(item)
				if (order < existing.minOrder) existing.minOrder = order
			} else {
				sectionMap.set(section, { items: [item], minOrder: order })
			}
		} else {
			topLevel.push(item)
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const stripOrder = ({ order: _order, ...item }: RankedItem): NavItem => item

	const sortedTopLevel = topLevel.sort((a, b) => a.order - b.order).map(stripOrder)

	const sections: NavSection[] = [...sectionMap.entries()]
		.map(([label, { items, minOrder }]) => ({
			label,
			minOrder,
			items: items.sort((a, b) => a.order - b.order).map(stripOrder)
		}))
		.sort((a, b) => a.minOrder - b.minOrder)

	return { topLevel: sortedTopLevel, sections }
}

export function useDocsNav(locale: MaybeRefOrGetter<string>, currentPath: MaybeRefOrGetter<string>) {
	// Each .md module exports individual front matter keys via exportFrontmatter: true
	const pages = import.meta.glob('../pages/docs/**/*.md', { eager: true }) as Record<string, DocFrontMatter>

	return computed(() => buildNavTree(pages, toValue(currentPath), toValue(locale)))
}
