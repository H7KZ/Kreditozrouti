export interface FISEventDetailsInterface {
    eventId: string | null
    title: string | null
    subtitle: string | null
    image: {
        src: string | null
        alt: string | null
    }
    date: string | null
    description: string | null
    place: string | null
    registrationFrom: string | null
    dateTime: string | null
    signForm: string | null
    substituteForm: string | null
}
