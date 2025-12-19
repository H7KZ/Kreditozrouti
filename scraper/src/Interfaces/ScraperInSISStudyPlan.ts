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

    // Rozšířené kategorie kurzů
    // Zahrnuje: oP, hP, sP, fP, eP (Povinné oborové, hlavní, vedlejší, fakultní, specializační)
    compulsory_courses_idents: string[] | null

    // Zahrnuje: oV, hV, sV, fV, eV (Volitelné v rámci specializace/oboru)
    elective_courses_idents: string[] | null

    // Zahrnuje: cTVS1, cTVS2 (Tělesná výchova)
    physical_education_courses_idents: string[] | null

    // Zahrnuje: cVM, cVD, cVP (Celoškolsky volně volitelné - "free credits")
    general_elective_courses_idents: string[] | null

    // Zahrnuje: oSZ, hSZ, sSZ, fSZ (Státní zkoušky a obhajoby)
    state_exam_courses_idents: string[] | null

    // Zahrnuje: oJ, fJ, sK (Jazykové moduly)
    language_courses_idents: string[] | null

    // Fallback pro nezařazené
    optional_courses_idents: string[] | null

    course_urls: string[] | null
}
