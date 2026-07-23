---
title: Notes on building a Raft-lite coordinator
date: 2026-07-15
---

`dbfailsim` runs a five-node cluster with a Raft-lite coordinator, and most of what I've learned came from watching it break on purpose rather than reading the paper again.

## Split brain is easy to cause, harder to notice

Partitioning the cluster is one line of code. Noticing that two sides both think they're the leader takes actual instrumentation — logging term numbers and leader IDs per node was what finally made it visible.

## Replica lag hides until you measure it

A replica that's a few hundred milliseconds behind looks fine until a client reads from it right after a write to the leader. Simulating that gap on purpose is the only way I found real bugs in read-path assumptions.

## Next

Working through partial failures next — nodes that are up, reachable, and quietly wrong.
