export interface ParsedPrerequisites {
	blocked_by_course_idents: string[] | null
	excluded_after_course_idents: string[] | null
	concurrent_exclusion_idents: string[] | null
	recommended_before_course_idents: string[] | null
}

const COURSE_CODE_RE = /\b\d[A-Za-z]{2,4}\s?\d{3}\b/g

// Alternatives are tried left-to-right in one pass so "nelze...po" wins before the "po"
// alternative can match the same text — prevents double-assignment.
const CLAUSE_RE =
	/(?<nelzePo>nelze\s+studovat\s+po\s+absolvov[aá]n[ií])|(?<nelzeS>nelze\s+studovat\s+sou[cč]asn[eě]\s+s)|(?<po>studovat\s+po\s+absolvov[aá]n[ií])/gi

const KEY_MAP: Record<string, keyof ParsedPrerequisites> = {
	nelzePo: 'excluded_after_course_idents',
	nelzeS: 'concurrent_exclusion_idents',
	po: 'blocked_by_course_idents'
}

function extractCodes(text: string): string[] {
	const seen = new Set<string>()
	for (const m of text.matchAll(COURSE_CODE_RE)) {
		seen.add(m[0].replace(/\s/, ''))
	}
	return [...seen]
}

export function parsePrerequisites(
	prerequisites: string | null,
	recommendedProgrammes: string | null
): ParsedPrerequisites {
	const buckets: Record<keyof ParsedPrerequisites, Set<string>> = {
		blocked_by_course_idents: new Set(),
		excluded_after_course_idents: new Set(),
		concurrent_exclusion_idents: new Set(),
		recommended_before_course_idents: new Set()
	}

	if (prerequisites) {
		type Clause = { clauseEnd: number; nextClauseStart: number; key: keyof ParsedPrerequisites }
		const clauses: Clause[] = []

		CLAUSE_RE.lastIndex = 0
		let m: RegExpExecArray | null
		while ((m = CLAUSE_RE.exec(prerequisites)) !== null) {
			const groupName = Object.entries(m.groups ?? {}).find(([, v]) => v !== undefined)![0]
			clauses.push({
				clauseEnd: m.index + m[0].length,
				nextClauseStart: m.index,
				key: KEY_MAP[groupName]
			})
		}

		for (let i = 0; i < clauses.length; i++) {
			const spanEnd = clauses[i + 1]?.nextClauseStart ?? prerequisites.length
			const span = prerequisites.slice(clauses[i].clauseEnd, spanEnd)
			for (const code of extractCodes(span)) {
				buckets[clauses[i].key].add(code)
			}
		}
	}

	if (recommendedProgrammes) {
		for (const code of extractCodes(recommendedProgrammes)) {
			buckets.recommended_before_course_idents.add(code)
		}
	}

	return {
		blocked_by_course_idents: buckets.blocked_by_course_idents.size > 0 ? [...buckets.blocked_by_course_idents] : null,
		excluded_after_course_idents: buckets.excluded_after_course_idents.size > 0 ? [...buckets.excluded_after_course_idents] : null,
		concurrent_exclusion_idents: buckets.concurrent_exclusion_idents.size > 0 ? [...buckets.concurrent_exclusion_idents] : null,
		recommended_before_course_idents: buckets.recommended_before_course_idents.size > 0 ? [...buckets.recommended_before_course_idents] : null
	}
}
