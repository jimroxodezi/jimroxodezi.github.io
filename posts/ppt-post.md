---
title: Programs, Processes And Threads
author: Jimrox Odezi
published: 2022-12-27
updated: 2026-07-23
---

# Programs, Processes And Threads

Dec 27, 2022 (updated Jul 23, 2026)

Share on:

*A note before you read on: this is one of my earliest posts, and re-reading it now, there were a few spots where I'd simplified things past the point of being quite right—especially around green threads, hyperthreading, and what "achieving parallelism" actually requires. I've fixed those, and used the excuse to go a fair bit deeper into how the OS actually pulls this off, since I think that's the interesting part.*

In this post, I go into quite a bit of detail about what I've learned about processes and threads.

## In the beginning…

Early computers were programmed without the program stored. That is, to run a different program meant reprogramming the computer for just that specific task. This even had to do with modifying hardware like the circuitry or adjusting some physical controls—rewiring a plugboard, flipping banks of switches, that sort of thing. There was no meaningful sense in which you could "load a new program"; the program *was* the physical configuration of the machine.

### Stored Program Computer

With rapid development and innovations came the idea of a stored program computer, which expresses a computer program as a sequence of coded instructions. Memory holds both data and instructions, sitting side by side in the same address space, distinguished only by how the CPU chooses to interpret them at a given moment. The CPU fetches, interprets, and executes successive instructions of the program—the classic *fetch–decode–execute* cycle that every subsequent architecture, in one form or another, still runs today. The two major models of this idea are the von Neumann architecture and the Harvard architecture, and the distinction between them is worth being precise about: von Neumann machines use one unified memory and address space for both instructions and data, which is simple but means a wild jump or an overrun can, in principle, let you read or overwrite executable code as if it were data; Harvard machines keep instruction memory and data memory physically or logically separate, with independent buses, so the two can even be fetched simultaneously. Most general-purpose CPUs today are technically a hybrid—von Neumann in how main memory is addressed, but Harvard-like at the cache level, with separate L1 instruction and data caches—precisely so instruction fetch and data access don't contend for the same cache port.

## A world of abstractions.

One of the most ubiquitous concepts in computer science and software engineering is the idea of abstraction. It is, in fact, a very commonly used term in the world of software. But what is abstraction?

Abstraction can mean many things to different people, but a quite astounding explanation (or definition, if you like) of abstraction can be found in this [blog post](https://the.scapegoat.dev/why-i-am-learning-category-theory-1/). Abstraction is defined as a controlled form of forgetting the details to focus on something more fundamental, allowing one to make statements that are shorter to state, yet broader in meaning.

I consider that a very excellent description of what abstraction is. This is very true of abstraction at every level of the software stack. We use web APIs without understanding the details or caring much about what's going on behind the scenes; we talk about computers fetching data from memory in a straightforward manner without considering much fine-grained detail like the memory hierarchy with its attendant concepts (caching, cache hits and misses, cache lines), memory paging and allocation, paged I/O operations on disks, and so on. We just simply talk about these "high-level" operations without paying much attention to the details. We often talk about *leaky abstractions* if, in an attempt to look at these high-level things, we begin to delve too much into the details and the abstraction stops holding up cleanly.

I've had to talk about abstraction because the idea of processes and threads is itself a very good abstraction we have to deal with as computer programmers—and, like most good abstractions, it's worth knowing exactly where it starts to leak.

## Programs and Processes

A program is an executable file that contains a list of all the instructions needed to perform a task on a computer. When the task (the executable file, or program) is running—that is, being executed by the processor—it is referred to as a process.

A program lists the instructions; a process executes the instructions. The idea of a process is a fundamental abstraction provided by the operating system (OS) in modern computing. A computer program is a passive collection of instructions typically stored in a file on disk. A process is the execution of those instructions after being loaded from disk into memory. Several processes can be associated with the same program—open two terminal windows and run the same shell binary in each, and you have one program and two entirely independent processes, each with its own memory, its own state, unaware of the other.

A process is an operating system abstraction that groups together a number of resources needed to run a program. Whilst a program is a static file that lists instructions a computer should run, the idea of a process is only obtainable at "runtime." A process is a program at runtime. At the operating system level, one of the things (or resources) that makes up a process is the thread(s).

A thread is the smallest sequence of instructions that can be independently managed by a scheduler.[^1] Multiple threads can exist within one process and share its resources[^2] such as memory, code, and sockets. Different processes do not share these resources by default, hence processes don't directly communicate with each other in the way threads within one process can—and we speak instead of interprocess communication ([IPC](https://en.wikipedia.org/wiki/Inter-process_communication)), which covers the deliberate, OS-mediated channels processes use to talk to one another anyway: pipes, message queues, shared memory segments the OS explicitly maps into both processes' address spaces, sockets, and signals.

The relation between a process and a program is like the relationship between a class and an object, or the relationship between an interface and an implementation.

A nice illustration that helps me think properly about the relationship between a program and a process is that of an orchestra. An orchestra plays a musical piece. As a matter of fact, it's the musical piece they are on stage for. The musical piece is just like a program; on its own it is passive. But when it is being played (executed), it has meaning. The passive musical piece, when it's being played, is just like a process.

### What a process actually owns

It's worth being concrete about what the OS bundles up into that "process" abstraction, because "a program at runtime" undersells how much bookkeeping is involved. When the OS creates a process, it allocates it (among other things): its own virtual address space, laid out in roughly four regions—a **text segment** holding the compiled machine code, a **data segment** for global and static variables, a **heap** that grows upward as the program allocates memory dynamically, and a **stack** (per thread, actually—see below) that grows downward as functions call other functions; a **process control block (PCB)**, the kernel's internal bookkeeping structure tracking the process's ID, its state, its scheduling priority, and a pointer to its page tables; a table of open **file descriptors**; and its own set of **signal handlers**. None of this is shared with other processes by default—which is precisely why processes are "isolated" and threads within one are not.

A process, at any given moment, is in one of a small number of **states**: *new* (being created), *ready* (waiting for the scheduler to give it CPU time), *running* (actually executing on a core right now), *blocked*/*waiting* (paused on I/O or some event it needs to happen first), or *terminated*. The scheduler's whole job, at a high level, is deciding which *ready* process or thread gets to become *running* next, and for how long, before being preempted back to *ready* to give someone else a turn.

### Threads

A thread is a sequential execution stream within a process. A process can either be single-threaded or multithreaded. By single-threaded, we mean the program has just one sequential path of execution. Multithreaded has to do with multiple paths of execution of the program—that is, many parts working together to fulfil a goal. Threads in a process share the same address space (that text/data/heap region described above), hence there is a need for synchronization whenever more than one of them touches the same piece of shared state; each thread does, however, get its own **stack**, its own **program counter**, and its own **register set**, since those are exactly the pieces of state a thread needs privately in order to have an independent execution stream at all. As long as we have a single active thread within a process, this process is still alive. A process with no threads cannot exist, since a thread is the unit of program execution.

Creating a new thread is meaningfully cheaper than creating a new process, and it's worth knowing why: a new process (via `fork()`, on POSIX systems) requires the OS to set up an entire new address space—historically a full copy of the parent's memory, though modern kernels use **copy-on-write** so the actual physical pages are only duplicated the moment either side writes to one, making `fork()` cheaper than it sounds but still meaningfully heavier than spinning up a thread, which just needs a new stack and register set within an *already-existing* address space it will share with its siblings. This cost difference is a big part of why thread pools and thread-per-request models were historically popular for servers, and also why a badly-behaved thread can corrupt state that every other thread in the process depends on—there's no memory-protection boundary between threads the way there is between processes.

### How threads actually get scheduled: 1:1, N:1, and M:N

This is the part I underspecified originally, and it's the key to correctly understanding the green threads and goroutines discussion below. There isn't just one way to map the threads your program creates onto the CPU cores actually available to run them—there are three classic models:

- **1:1 (native/kernel threads).** Each thread you create in your program corresponds to exactly one thread the OS kernel itself knows about and schedules directly onto a core. This is how `pthread_create()` on Linux, or `std::thread` in C++, work. The OS scheduler is doing the real work; your language runtime is just a thin wrapper.
- **N:1 (pure green/user-space threads).** Many "threads" as your program sees them are multiplexed onto a *single* OS thread by a scheduler that lives entirely in userspace, inside your language's runtime. The kernel only ever sees one thread. This is cheap to create and cheap to switch between (no syscall, no kernel involvement), but it has one hard limit: since the kernel only sees one OS thread, it can only ever put that one thread on one core at a time. No matter how many "green threads" you spawn, they can never run two instructions truly simultaneously—you get concurrency (interleaving), never parallelism (actual simultaneity on separate cores).
- **M:N.** A hybrid: M user-space threads are multiplexed across N kernel threads by a runtime-level scheduler, where N is usually tied to the number of available CPU cores. This is the interesting one, because it gets you the cheap creation and cheap context-switching of green threads *and* real parallelism, since the runtime can and does schedule different user-space threads onto different kernel threads running on different cores at the same time.

With that vocabulary in hand, the rest of this section holds up much better than it did originally.

## Etymological nuances.

The word "process" has been used to mean a different thing in other contexts—the foremost I know of is in Tony Hoare's Communicating Sequential Processes ([CSP](https://en.wikipedia.org/wiki/Communicating_sequential_processes)) paper. "Process," as used by him, referred to a unit of concurrent computation—a concurrency primitive, deliberately abstracted away from whatever OS-level thread or process might eventually run it. Many programming languages whose memory models have been totally or partially based on the CSP model have come to use different terminology to refer to these processes: goroutines and channels in Go, actors in Erlang, and so on.

Go's own FAQ, for instance, credits Hoare's CSP paper (alongside Occam and Erlang, two earlier languages built on the same ideas) as a foundational influence, while noting that Go's particular take on it—channels as first-class, directly usable values—traces to a somewhat different branch of that same family of ideas.

On goroutines specifically, the Go team has described the underlying idea as an old one: multiplexing many independently-executing functions onto a pool of OS threads, such that when one blocks on something like a system call, the runtime transparently shifts the others sharing that OS thread onto a different, runnable one, without the programmer ever having to think about it. In the vocabulary above, goroutines are the **M:N model**: many goroutines, scheduled by Go's own runtime scheduler across `GOMAXPROCS` OS threads (defaulting to the number of logical CPUs available). That's the detail that makes goroutines able to achieve genuine parallelism, not just concurrency—something worth being precise about, since it's exactly where classic green threads fall short.

#### Green threads

The idea of green threads was popularized by early versions of the Java programming language, where they were the *original* threading model: scheduled and managed entirely by the Java Virtual Machine (JVM)—Java's own runtime—rather than by the operating system, which let Java run its threading model even on platforms with no native OS thread support at all. Green threads are user-space threads: the OS doesn't manage them, doesn't know how many exist, and in that classic JVM implementation, saw the entire JVM as a single OS process with a single OS thread. That's the N:1 model described above, and it's precisely why those original green threads could only ever achieve *concurrency*—interleaved execution—never true *parallelism*, no matter how many cores the machine underneath actually had.

It's worth being clear that this describes *early* Java specifically (green threads were dropped from mainstream JVMs around Java 1.3, in favor of a straightforward 1:1 mapping onto native OS threads, which is what "a Java `Thread`" has meant for most of the language's history since). Interestingly, the idea has come back: modern Java (JDK 21 onward) introduced **virtual threads** under Project Loom, which are lightweight, JVM-managed threads in the same spirit as the old green threads—except this time built on the M:N model rather than N:1, multiplexed across a small pool of real OS "carrier" threads. So a modern Java virtual thread *can* achieve genuine parallelism across cores, unlike its N:1 ancestor; what it inherits from the original green-thread idea is just the cheapness of creation (you can spin up millions of them) and the fact that blocking one doesn't require blocking an entire OS thread underneath it.

These concurrency primitives are quite different from native (1:1) threads in exactly this dimension: whether the model, as implemented, is capable of true parallelism, or only ever concurrency—which, as it turns out, depends less on the "green thread" label itself and more on whether there's an N:1 or M:N scheduler underneath.

## Programming

Several non-trivial computer programming languages provide APIs and mechanisms for working with native threads and spawning new processes at a high level of abstraction. Python, for instance, has modules for multiprocessing and multithreading. Example code:

```python
from multiprocessing import Process

def f(name):
    print('hello', name)

if __name__ == '__main__':
    p = Process(target=f, args=('bob',))
    p.start()
    p.join()
```

It's worth pointing at `multiprocessing` specifically here, rather than `threading`, and being explicit about why: for CPU-bound work, Python's `threading` module historically could not give you real parallelism even across multiple cores, because of the **Global Interpreter Lock (GIL)**—a single lock inside the CPython interpreter ensuring only one thread executes Python bytecode at a time, no matter how many OS threads or cores you have. Python threads are real, 1:1, OS-scheduled threads; the GIL just means only one of them is ever actually running Python code at once, which makes `threading` genuinely useful for I/O-bound work (a blocked thread releases the GIL while it waits) but not for CPU-bound work, which is precisely why `multiprocessing`—actual separate OS processes, each with its own interpreter and its own GIL—is the traditional way to get real parallelism for CPU-heavy Python code:

```python
import threading

def f(name):
    print('hello', name)

# Real OS thread, but still bound by the GIL for CPU-bound work
t = threading.Thread(target=f, args=('bob',))
t.start()
t.join()
```

This has actually started to change: as of Python 3.13, there's an official experimental **free-threaded** build of CPython (from PEP 703) that removes the GIL entirely, allowing genuine multi-core parallelism from the `threading` module directly. It's not yet the default build as of this writing, but it's the first real crack in a limitation that's shaped how Python concurrency is taught and written for over two decades.

## Related stuff.

### Hyper-threading.

Hyper-threading happens at the lowest level of abstraction available to the programmer. In modern multi-core CPUs, each physical core can present itself to the operating system as two separate logical cores that the OS schedules onto independently—Intel's brand name for this is Hyper-Threading; the general technique, implemented by other vendors too, is called simultaneous multithreading (SMT). Hence a system can have four physical cores (a quad-core) and eight logical cores of execution visible to the OS through hyper-threading.

The important nuance I skated past originally: this doesn't double your actual computing throughput. The two logical cores sharing one physical core still share that core's actual execution units, caches, and other resources—what SMT really buys you is the ability to fill in a core's idle cycles (which happen constantly, while one thread is stalled waiting on a cache miss or a memory access) with useful work from a second thread, rather than leaving those cycles wasted. In practice this typically yields something more like a 15–30% throughput improvement for suitable workloads, not the 2x a naive reading of "eight logical cores" might suggest—and for some workloads, particularly ones already saturating a core's execution units or fighting over its cache, hyper-threading can even make things slightly *worse* by adding contention, which is why it's sometimes disabled entirely for latency-sensitive or security-sensitive workloads.

It's also worth knowing that CPU core design itself has gotten less uniform since I first wrote this: recent CPUs, from Apple Silicon to Intel's hybrid designs, ship with *asymmetric* cores on the same chip—a mix of performance cores and efficiency cores with genuinely different clock speeds and capabilities, not just identical cores that happen to be counted differently. The OS scheduler has to be aware of that asymmetry when deciding what to run where, which is a meaningfully newer problem than the uniform-core-count math above assumes.

### Context switching, briefly

Since we've been talking about the scheduler moving things between *ready* and *running*, it's worth naming what a **context switch** actually costs, because it's not free, and it's part of why the process-vs-thread distinction matters practically, not just architecturally. Switching between two threads *within the same process* is relatively cheap: the CPU has to save one thread's registers and program counter and load the other's, but since they share the same address space, there's no need to change what the CPU's memory-management unit (MMU) considers valid memory. Switching between two threads *in different processes* is more expensive, because it typically also means flushing or reloading the translation lookaside buffer (TLB)—the CPU's cache of virtual-to-physical address translations—since the new process has an entirely different address space, and stale cached translations pointing at the old process's memory would be actively wrong for the new one. This is one more concrete, low-level reason lightweight (green, or M:N) threading models can meaningfully outperform relying purely on OS processes or native threads for very fine-grained concurrency: fewer, cheaper context switches.

## Where things stand now (2026)

The core ideas here—program vs. process vs. thread, the OS-level bookkeeping a process carries, and the 1:1/N:1/M:N distinction—haven't changed; they're the same fundamentals whether you learned them in 2022 or today. A few things worth knowing if you're catching up:

- **Java's virtual threads (Project Loom)**, mentioned above, are now a mainstream, stable feature (since JDK 21), and are genuinely changing how high-concurrency Java servers get written—closer in spirit to goroutines than to the JVM's old green threads.
- **CPython's free-threaded build** continues to mature past its initial experimental release, and is the most serious attempt yet at lifting the GIL limitation described above.
- **Asymmetric (big.LITTLE-style) core designs** are now mainstream across both mobile and desktop CPUs, which has made OS thread schedulers noticeably more sophisticated than the "N identical cores" model most operating systems assumed for decades.
- **Containers** (Docker, and friends) are worth mentioning here too, since they're often misunderstood as some kind of lightweight VM: a container is, at the OS level, just an ordinary process (or group of processes), given the *illusion* of isolation via Linux namespaces (for what it can see: its own process IDs, its own network stack, its own filesystem view) and resource limits via cgroups (how much CPU, memory, and I/O it's allowed to use)—not a separate kernel, and not a new concurrency primitive, just a different way of drawing the isolation boundary around a perfectly ordinary process.

None of that displaces anything above—the process and thread abstractions this post is actually about are as foundational now as they were when Hoare, Dahl, and the early Unix and JVM designers were arguing about them.

## References
[^1]: A scheduler is like a management layer. It is part of the operating system (or the runtime, for user-space threads) that carries out the scheduling activity for program execution. By keeping computer resources busy, it ensures efficient distribution of processor time among many threads, assigning priority to threads according to a set of rules.
[^2]: A system resource is anything needed for the functioning of computer programs. This includes memory, CPU time, files, network connections (sockets), caches, and interrupt request lines (IRQs), among others.
