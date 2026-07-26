---
title: Notes on Learning Distributed Systems
date: 2026-07-23
excerpt: My personal notes on distributed systems.
---


This is going to be a progressive note on my learnings on distributed systems. I'll keep adding to it as I learn more. I just hope it remains coherent as I'll keep adding to it...or better still, I'll make this a multi-part series.

I've observed that learning about distributed systems—in theory and practice—is actually very hard. Though a beginner, I'm starting out with reading distributed systems papers and also following up with the popular Martin Klepmann's distributed systems course on youtube. I watched the course about two years ago but most of it went over my head as was missing out on some requisite knowledge. But I believe I'm ready to follow through the course now and also be able to follow through distributed systems papers. 

Reading through research papers is quite easier with the advent of LLMs. You can literally use LLMs to get a thorough breakdown and summary of these papers without getting into the pedantic details that sometimes feels like gatekeeping lol.

I used claude to curate a list of papers to read and I think the recommended list was good. I'm starting out with three papers which are like a philosophical core to most distributed system ideas:
- [Time, Clocks, and the Ordering of Events in a Distributed System — Lamport (1978)](https://lamport.azurewebsites.net/pubs/time-clocks.pdf) : This is very authoritative and influential paper on distributed system timing and event ordering.
- [Impossibility of Distributed Consensus with One Faulty Process (FLP) — Fischer, Lynch, and Paterson (1985)](https://dl.acm.org/doi/10.1145/3168.3169) : This paper shows that consensus cannot be achieved in a distributed system with one faulty process.
- [Unreliable Failure Detectors for Reliable Distributed Systems — Chandra, Toueg (1996)](https://dl.acm.org/doi/10.1145/1292517.1292523) : This paper introduces unreliable failure detectors, which are crucial for reliable distributed systems.
