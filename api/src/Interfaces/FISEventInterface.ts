export default interface FISEventInterface {
    eventId: string | null
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
    registrationFrom: string | null
    registrationUrl: string | null
    substituteUrl: string | null
}
