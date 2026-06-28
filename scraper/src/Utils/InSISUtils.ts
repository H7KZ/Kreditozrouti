// ponytail: re-exports only — all logic moved to @shared/utils/insis (scraper-api-separation)
export {
	GroupPrefixes,
	CategoryRules,
	determineGroup,
	determineCategory,
	parseGroupCode,
	extractSemester,
	extractYear
} from '@shared/utils/insis'
