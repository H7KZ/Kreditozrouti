export default interface FISGetEventsInterface {
    data: string
    max_num_pages: number
}

export interface FISEventInterface {
    eventId: string | null
    postId: string | null
    link: string | null
    image: {
        src: string | null
        alt: string | null
    }
    date: string | null
    title: string | null
    category: string | null
}
