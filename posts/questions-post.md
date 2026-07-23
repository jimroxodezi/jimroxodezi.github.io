---
title: On Questions.
author: Jimrox Odezi
published: 2023-05-31
updated: 2026-07-23
---

# On Questions.

May 31, 2023 (updated Jul 23, 2026) • Jimrox Odezi

Share on:

*A note before you read on: the original version of this was short, and jumped straight to the abstract point without ever landing it anywhere concrete. I still believe the core idea, so I've kept it, given it more room, and this time actually walked it all the way down into software engineering, which is where I find myself applying it almost daily.*

Asking the right questions can be a litmus test of the understanding of a subject. Asking questions is generally thought of as a way of seeking clarification and understanding, but that is not the whole idea of asking questions.

> Asking the right questions takes as much skill as giving the right answers.
> —Robert Half

If you are yet to ask the right questions when learning a thing, you likely do not understand the thing yet. Asking the right questions is a pointer to right thinking about a subject. It is a mark of a budding intuition when learning.

In today's world, where there is an abundant stream of information, seeming answers to questions are not far-fetched. It is good questions—right questions, actually—that are lacking, not answers. To find the right answers, we must ask the right questions!

I think this same idea applies to learning materials: a good learning material is one that helps you think rightly about what you're learning. It educates you to a point where you can start asking good questions, develop strong intuitions, and even formulate and invent new ideas and concepts of your own.

> The one who knows all the answers has not been asked all the questions.
> – Confucius

Teachers are not left out of this either. Good teachers stimulate their students to ask the right questions. The primary idea of teaching—which is to give education—is so as to put your students in a position where they can ask the right questions themselves, long after the teacher isn't in the room anymore.

## What actually makes a question "right"

So far, I've talked about the idea of "right questions." But one may ask: what does the right question even mean?

A right question, in my opinion, is an inquiry born out of a budding intuition about a subject—it's a question that could only really be asked by someone who has already started to see the shape of the thing, even if they can't yet fill in the details. It also tends to be a *first-principles* inquiry: a question that goes back to why something is the way it is, how it actually works underneath, who's actually involved or responsible, and when it does or doesn't apply—rather than a question that just asks for a fact to be handed over.

There's a useful test for telling the two apart. A shallow question can usually be answered by a single lookup: "what does this function return?" A right question tends to open something up rather than close it down: "why does this function need to exist at all, given what already handles this case two layers up?" The first kind gets you an answer. The second kind gets you closer to actually understanding the system the answer lives in—and often, in the process of trying to answer it, you discover the original question wasn't quite the right one either, and a better one takes its place. That's not a failure of the question. That refinement, question sharpening into better question, is usually what real understanding *feels like* from the inside, moment to moment, rather than a thing that happens once and is done.

This is also why a question can be a better signal of understanding than an answer is. Anyone can repeat back an answer they were given. Producing a genuinely good question about a subject requires having already built enough of an internal model of it to notice exactly where the model has a gap—which is a much harder thing to fake.

## Where this shows up in software

Nowhere have I found this idea more practically useful than in software engineering, where the whole job is arguably an ongoing exercise in figuring out which question you're actually supposed to be answering.

**Debugging is asking questions, mostly.** The most experienced engineers I've watched debug something don't start by guessing fixes—they start by asking questions of the system: what did I expect to happen here, what actually happened instead, and where exactly is the first point at which those two things diverge? Every good debugging session is really a sequence of narrowing questions, each one designed to cut the space of possible causes in half. "Is the data wrong before it gets here, or after?" "Is this failing every time, or only under load?" "Did this ever work, or have I just never tested this path?" A wrong fix applied confidently is almost always the result of skipping straight to an answer without first asking the question precisely enough to know what you were actually fixing. This is the same instinct behind rubber-duck debugging: the duck doesn't answer anything, but explaining your problem out loud, one honest question at a time, to something that can't nod along and pretend to understand, has a funny way of surfacing the question you'd been avoiding asking yourself.

**Requirements and specs are questions in disguise.** A stakeholder saying "I want a button that does X" is not, by itself, enough to build the right thing—it's an invitation to ask the first-principles questions the request is standing in for: why does this need to exist, who is actually going to use it and under what conditions, what happens when the obvious happy path doesn't apply, what does "done" even mean here? Engineers who skip this step and go straight to implementing the literal request are answering a question nobody with real understanding of the problem would have actually asked. This is, incidentally, most of what a good product manager or tech lead is doing when they push back on a ticket with "wait, what problem are we actually solving here"—they're doing exactly the "right question" work this post keeps returning to.

**Code review, at its best, is a series of right questions rather than a list of demands.** "Why did you choose this approach over the simpler one?" opens a conversation and might surface a constraint the reviewer didn't know about. "Change this to use a map instead" closes one, and might be wrong, because it skips straight to an answer for a question that was never actually asked out loud. The best reviewers I've worked with review by asking; the worst review by dictating—and it's not a coincidence that the former tends to catch more real problems, because the question format forces both people to actually reckon with the "why," instead of one person just complying with the "what."

**System design interviews exist almost entirely to test this skill directly.** A weak candidate hears "design a URL shortener" and starts drawing boxes immediately. A strong candidate asks: how many requests per second are we expecting, does a shortened URL need to be guessable or not, do we need analytics on click-through, is this read-heavy or write-heavy, what happens if two people try to shorten the same URL? None of those questions are stalling for time—they're the actual work of figuring out which of several very different systems is the right one to build, and the interviewer is watching for exactly that instinct, not for how fast the candidate can draw a load balancer.

**Architecture and technical-debt decisions live or die on the questions asked before a single line of code is written.** "Why does this service own this data?" "What breaks if this queue backs up for ten minutes?" "Who else is depending on this API staying exactly as it is?" These are first-principles questions about a system, in exactly the sense described above—why, how, who, when—and skipping them is how you end up with architecture that technically satisfies today's request while quietly making next year's request much harder to satisfy.

If there's one thread running through all of this, it's that in software, the cost of a wrong answer is rarely the answer itself—it's having built on top of it before anyone asked the question that would have caught it. Learning to ask the right question, early and precisely, is cheaper than almost anything you'll ever do to fix the consequences of not having asked it.

---
