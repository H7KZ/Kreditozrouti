import { Faculty } from '@api/Database/types'

export type ExtendedFaculty = Partial<Faculty> & { titles: Record<string, string> }
export const FACULTIES: ExtendedFaculty[] = [
	{
		id: 'FFU',
		titles: {
			cs: 'Fakulta financí a účetnictví',
			en: 'Faculty of Finance and Accounting',
		},
	},
	{
		id: 'FMV',
		titles: {
			cs: 'Fakulta mezinárodních vztahů',
			en: 'Faculty of International Relations',
		},
	},
	{
		id: 'FPH',
		titles: {
			cs: 'Fakulta podnikohospodářská',
			en: 'Faculty of Business Administration',
		},
	},
	{
		id: 'FIS',
		titles: {
			cs: 'Fakulta informatiky a statistiky',
			en: 'Faculty of Informatics and Statistics',
		},
	},
	{
		id: 'NF',
		titles: {
			cs: 'Národohospodářská fakulta',
			en: 'Faculty of Economics',
		},
	},
	{
		id: 'FMJH',
		titles: {
			cs: 'Fakulta managementu',
			en: 'Faculty of Management',
		},
	},
	{
		id: 'OZS',
		titles: {
			cs: 'Oddělení zahraničních styků (PZAH REK)',
			en: 'International Office (PZAH REK)',
		},
	},
	{
		id: 'IFTG',
		titles: {
			cs: 'Francouzsko-český institut řízení (PZAH REK)',
			en: 'French-Czech Institute of Management (PZAH REK)',
		},
	},
	{
		id: 'CESP',
		titles: {
			cs: 'Program studií střední a východní Evropy (PZAH REK)',
			en: 'Central and East European Studies Program (PZAH REK)',
		},
	},
	{
		id: 'IOM',
		titles: {
			cs: 'Institut oceňování majetku (PSTR REK)',
			en: 'Institute of Property Appraisal (PSTR REK)',
		},
	},
	{
		id: 'U3V',
		titles: {
			cs: 'Univerzita třetího věku',
			en: 'University of the Third Age',
		},
	},
	{
		id: 'U3V-JH',
		titles: {
			cs: 'Univerzita třetího věku - Jindřichův Hradec (PSTR REK)',
			en: 'University of the Third Age - Jindřichův Hradec (PSTR REK)',
		},
	},
]
