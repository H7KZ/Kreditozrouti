export default interface FISEventInterface {
    id: string | null
    title: string | null
    subtitle: string | null
    categories: string[] | null
    datetime: string | null
    image: {
        src: string | null
        alt: string | null
    }
    description: string | null
    place: string | null
    author: string | null
    language: string | null
    registration_from: string | null
    registration_url: string | null
    substitute_url: string | null
}
