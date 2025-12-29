export default interface ScraperInSISStudyPlan {
    id: number
    url: string
    ident: string | null
    title: string | null
    faculty: string | null
    semester: string | null
    level: string | null
    mode_of_study: string | null
    study_length: string | null

    courses: ScraperInSISStudyPlanCourseCategory[] | null
}

export interface ScraperInSISStudyPlanCourseCategory {
    id: number | null
    url: string | null
    ident: string

    // compulsory
    // Zahrnuje: oP, hP, sP, fP, eP (Povinné oborové, hlavní, vedlejší, fakultní, specializační)

    // elective
    // Zahrnuje: oV, hV, sV, fV, eV (Volitelné v rámci specializace/oboru)

    // physical_education
    // Zahrnuje: cTVS1, cTVS2 (Tělesná výchova)

    // general_elective
    // Zahrnuje: cVM, cVD, cVP (Celoškolsky volně volitelné - "free credits")

    // state_exam
    // Zahrnuje: oSZ, hSZ, sSZ, fSZ (Státní zkoušky a obhajoby)

    // language
    // Zahrnuje: oJ, fJ, sK (Jazykové moduly)

    // optional
    // Fallback pro nezařazené
    category: 'compulsory' | 'elective' | 'physical_education' | 'general_elective' | 'state_exam' | 'language' | 'optional'
}
