# The Story of Kreditožrouti

*Credit-gobblers. A course scheduler for VŠE students, built from a hackathon joke into something people actually use
every day.*

---

## It started as a joke at a hackathon

Kreditožrouti was born at a FIS hackathon at our university, under the theme "upgrade the uni." Three of us signed up as
a team - Amélie, Ondra, and me.

We went looking for the thing at school most worth upgrading, and kept landing on the same answer: there is no good
software for building your semester schedule other than InSIS itself, and InSIS is not exactly a joy to plan around. So
the idea was simple and a little cheeky - take the public InSIS data, scrape it, and put better search and better
algorithms on top of it than the system gives you.

Somewhere in that weekend, half-joking, someone said we should call it *Kreditožrouti*. It stuck for two reasons. It
sounded the coolest. And it meant something true: when your schedule is set wrong, courses eat up your ECTS credits far
beyond what they should. Credit-gobblers. A name that is really a jab at a badly-set timetable.

## From a joke to coursework

The hackathon idea did not stay a hackathon idea. It rolled into a software engineering course, where a group of us
built a project called the **4FIS calendar**. Kreditožrouti started life there, as a side feature growing quietly inside
that project. A few more teammates joined for that stretch - Milan, Adam, and Patrik.

Most of the hard parts - the scraping logic and the complexity of pulling clean data out of InSIS - trace directly back
to the 4FIS scraper infrastructure built during that course. That groundwork is the reason the rest was even possible.

## When the course ended, one of us kept going

Courses end. Most course projects end with them. This one did not.

When the software engineering course wrapped, I picked Kreditožrouti up and kept building - alone, this time - to push
it to a real, finished product rather than a demo. It helped that people actually cared: friends used it, liked it, and
Ondra in particular kept giving real, honest feedback that shaped where it went, long after the hackathon was over.

## A quiet stretch, then a surge

It nearly stalled in early 2026. Life gets busy and side projects are the first thing to go quiet.

What pulled it back was a mix of things: the motivation from people who genuinely liked the product, Ondra's continued
feedback, and finally having the time to sit with it properly. Around that point I brought AI into the development
process itself, which sped up both the work and the product dramatically - and it is also when the idea of turning all
of this into a thesis started to take shape. So I kept going, and the project had its biggest push yet.

## Where it is today

Kreditožrouti is live and running - with monitoring, alerts, and automatic deployments behind it. It is used by a small
but real group of students building their schedules:

- **350 students** have used it
- **443 visits**, 1.17k page views
- **43%** finish the onboarding wizard
- **~4-5 students a day** on average, with a peak of **68 in a single day**
- Roughly a minute and three-quarters per visit

Most people find it through Discord and Facebook posts and through friends telling friends. The numbers are modest on
purpose - this was never a startup. It is a tool that quietly saves a few students' semesters, every day.

## Where it leads

Kreditožrouti is not really thesis material on its own, and that is fine - it was never meant to be. What it became
instead is the predecessor to the thesis.

Building it taught me the InSIS data inside out - how it is shaped, where it hides, how to make it useful. That
understanding is what led to the actual thesis: an MCP server built over InSIS data, this time under an official
university domain, with proper guidance and running on the university's own servers. The scrappy credit-gobbler grew up
into something official.

It all began with Kreditožrouti.

---

### Credits

- **Jan Komínek** - creator, and the one who carried it from prototype to live product
- **Amélie Engelmaierová** - co-founder at the hackathon, where the repo (and the name) began
- **Ondra** - the feedbacker; not in the commit history, but all over the product
- **Milan Nguyen, Adam Hlína, Patrik Šimonek** - teammates from the 4FIS calendar course project
