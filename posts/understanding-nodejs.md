---
title: Understanding Node.js
author: Jimrox Odezi
published: 2023-03-11
updated: 2026-07-23
---


*A note before you read on: I wrote this back in 2023, when I was still finding my footing with Node.js. Re-reading it now, a few things I said were oversimplified or just wrong, so I've gone back in and fixed them, updated the parts that time has moved past, and pushed the explanations down closer to the syscall and C-source level, because the "beginner" version I drafted at one point glossed over exactly the details that make this stuff interesting. The core ideas still hold up—I just understand them, and can now argue for them from the actual implementation, better than I did in 2023.*

I really didn't like Node.js or JavaScript as a programming language due to its seemingly difficult to understand programming constructs—and this made me shy away from web programming, especially front-end programming that makes heavy use of the JavaScript programming language. But with time, I started to understand the language (JavaScript) and the runtime (Node.js). This is true for understanding anything, innit?–getting to understand the basic building blocks and fundamental ideas that stack up to become the very intricate and often intimidating-to-beginners systems. It's a fact that if we give it time (and thorough learning), we can grok anything no matter how intricate it may seem.

I love backend engineering and my first exposure to Node.js was through the Express.js framework. This is probably the way it is for most beginner programmers and the evidence is clear from many YouTube tutorials and blog posts about building web servers in Node.js. But premature exposure to frameworks like this can make us lose sight of the fundamental idea or underlying details and principles of a programming language or runtime—and the fundamentals here are genuinely a systems-programming topic, not just a JavaScript-API topic.

## What Node.js actually is, precisely

Node.js is not a language—JavaScript is the language, V8 is the engine that compiles and executes it, and Node.js is the C++ host program that embeds V8 and links it against **libuv**, the C library that provides the actual event loop, non-blocking I/O abstraction, and threadpool. When you run `node app.js`, you are running a C++ binary that: starts a V8 isolate, compiles your JS, sets up a `uv_loop_t`, and then calls `uv_run()` on that loop for as long as there's work (handles or requests) keeping it alive. Everything downstream of that—`fs.readFile`, `setTimeout`, the HTTP server—is JavaScript-facing sugar over libuv primitives.

That distinction matters because most of what makes Node.js *interesting* as a runtime isn't in V8 at all—it's in how libuv turns each operating system's native async I/O facilities into one uniform, cross-platform event loop.

## Programming Paradigms

Node.js's event-driven model is a specific answer to a specific systems problem: how do you serve many concurrent connections without paying for one OS thread per connection? Ryan Dahl's original framing:

> No function performs direct I/O, to receive data from disk, network or another process, there must be a callback. The API should be familiar to client-side JavaScript and the Unix programming interface.

—Ryan Dahl, on his initial presentation of the Node.js project.

The alternative—thread-per-connection—has a real cost measured in kernel resources: each thread needs its own stack (typically megabytes of virtual address space reserved, even if not all resident), a kernel scheduling entity (a `task_struct` on Linux), and every blocking syscall it makes (`read()`, `recv()`, a blocking DB driver call) parks that whole thread, at which point the kernel scheduler has to context-switch away from it, which is itself not free—you're paying for register save/restore, TLB and cache effects, and scheduler bookkeeping, for a thread that is doing precisely nothing.

Node.js instead keeps one OS thread running your JavaScript and pushes every I/O operation down through libuv, which either issues it as truly non-blocking against the kernel (sockets) or hands it to a worker thread in an internal pool (filesystem calls, DNS, some crypto)—either way, your one JS thread never calls a blocking syscall and never gets parked by the scheduler waiting on I/O. It just keeps pulling the next ready callback off a queue. `server.on()` being an alias for `server.addListener()`, and every I/O-capable object in Node.js being an `EventEmitter`, is the JS-facing surface of that decision:

```js
document.getElementById('btn').addEventListener(eventName, callback)
```

—the browser event model and Node.js's I/O model are the same *shape* of solution to two different instances of the same problem: "don't block a thread waiting on something that finishes later; get notified."

## Node Architecture, down to the syscalls

Node.js is not single-threaded per se—it is the JavaScript engine responsible for executing JavaScript code that is single-threaded. There is exactly one V8 isolate, one call stack, running on one OS thread—the "main thread." Everything else is infrastructure libuv builds around that single thread.

### The socket path: no threadpool involved

For network sockets, libuv doesn't use extra threads at all—it uses the operating system's native readiness-notification API, and this differs by platform:

- **Linux:** `epoll` (`epoll_create`, `epoll_ctl`, `epoll_wait`)
- **macOS/BSD:** `kqueue`
- **Windows:** I/O Completion Ports (IOCP)—notably the odd one out, since IOCP is a *completion*-based model (tells you when an operation has finished) rather than a *readiness*-based model (tells you when an fd is ready to read/write without blocking). libuv's Windows backend has to emulate readiness semantics on top of a completion-based API, which is a genuinely nontrivial piece of engineering hiding under a single cross-platform `uv_poll_t` abstraction.

The mechanism, concretely, on Linux: every socket libuv cares about is set non-blocking (`O_NONBLOCK`) and registered with a single `epoll` instance via `epoll_ctl(EPOLL_CTL_ADD, ...)`. Each iteration of the event loop calls `epoll_wait()` once, with a computed timeout (more on that below), and gets back a list of file descriptors that are ready for reading or writing *right now*, without blocking. Node.js/libuv then calls `read()`/`write()` on exactly those fds, which are guaranteed not to block since the kernel just told you they're ready. This is the entire trick behind "handle thousands of concurrent connections with one thread": a single `epoll_wait()` call scales to tens of thousands of watched file descriptors far better than would one thread per connection, because the kernel is doing the multiplexing, not your userland scheduler.

### The threadpool path: for things epoll can't help with

Not everything has a readiness-notification API. Local filesystem I/O is the big one—POSIX file I/O syscalls (`read()`, `open()`, `stat()`) don't have a portable non-blocking readiness mechanism the way sockets do, so libuv can't just epoll its way out of blocking on disk. Instead, libuv maintains an internal **threadpool**—four threads by default (`UV_THREADPOOL_SIZE`, tunable up to 1024)—implemented with a work queue guarded by a mutex, with worker threads blocked on a condition variable until work is pushed. When you call `fs.readFile()`, Node.js queues a work item onto that pool; a worker thread wakes up, makes the (blocking, as far as it's concerned) syscall itself, and when it completes, signals back to the main loop via a `uv_async_t` handle—an inter-thread signaling primitive libuv exposes precisely for "wake the main loop up, something finished on another thread." The callback you wrote in JS still only ever executes on the main thread; the threadpool's job is purely to absorb the blocking syscall so the main thread never has to.

DNS resolution (`dns.lookup`, which shells out to the OS's resolver, `getaddrinfo()`) and some CPU-heavy crypto/zlib operations also go through this same pool, for the same reason: no portable non-blocking syscall exists for them.

```
                    Main thread (V8 + libuv event loop)
                                  │
              ┌───────────────────┼────────────────────┐
              │                   │                     │
        epoll_wait()        uv__run_timers()      uv__run_pending()
       (sockets, TTY,        (min-heap of          (queued threadpool
        pipes — readiness)    uv_timer_t)           completions via
              │                                      uv_async_t)
              ▼                                            ▲
        kernel notifies                                    │
        fd ready, then                              ┌──────┴───────┐
        read()/write()                              │  Threadpool   │
        (non-blocking,                               │  4 workers,   │
        never parks the                              │  mutex +      │
        main thread)                                 │  condvar queue│
                                                       │  fs, dns,     │
                                                       │  some crypto  │
                                                       └───────────────┘
```

This is the distinction I only gestured at back in 2023: the threadpool is internal plumbing Node manages for you, invisibly, behind APIs like `fs.readFile()`. `worker_threads`, by contrast, spins up an entirely separate V8 isolate with its own heap and its own event loop, on its own OS thread, that *you* create and manage explicitly, for genuinely CPU-bound JavaScript—work that would otherwise occupy the one call stack that everything else needs. `child_process` is the third, coarsest tool: a whole separate OS process, for when you want isolation at the process level (a different program entirely, like `ffmpeg`) rather than just a separate thread of JS execution.

According to the Node.js docs:

> When Node.js performs an I/O operation, like reading from the network, accessing a database or the filesystem, instead of blocking the thread and wasting CPU cycles waiting, Node.js will resume the operations when the response comes back.

This is true, but the mechanism differs by I/O type in exactly the way described above—sockets via kernel readiness APIs, filesystem via the threadpool—and conflating the two, which I did in the original version of this post, misses a real engineering distinction that shows up the moment you tune `UV_THREADPOOL_SIZE` and watch filesystem-heavy workloads speed up while socket-heavy workloads are unaffected by that same knob.

## Events and EventEmitters

`EventEmitter` is the userland pattern that libuv's callback-based internals surface through. `eventEmitter.on()` is a straight alias for `eventEmitter.addListener()`—verifiable in the [Node.js `events` source](https://github.com/nodejs/node/blob/main/lib/events.js)—and every I/O-capable object (`net.Server`, `fs.ReadStream`, `process` itself) is built on it. Worth being precise about the mechanics, because they're easy to get wrong once you're reasoning about ordering and correctness:

```js
const EventEmitter = require('events');

class OrderTracker extends EventEmitter {
  ship(orderId) {
    this.emit('shipped', orderId);
  }
}

const tracker = new OrderTracker();
tracker.on('shipped', (orderId) => console.log(`Order ${orderId} has shipped!`));
tracker.on('shipped', (orderId) => console.log(`Sending confirmation email for order ${orderId}...`));
tracker.ship(42);
```

`emit()` is **synchronous**—it walks the listener array for that event name and invokes each one, in registration order, on the current call stack, before `emit()` itself returns. It does not enqueue anything onto the event loop or the microtask queue; there's no phase transition involved. This has two consequences worth internalizing: first, if a listener throws and you haven't wrapped the `emit()` call or handled `'error'`, that exception propagates synchronously out of `emit()` to its caller, exactly like any other synchronous throw—it does not become an unhandled-rejection-style event. Second, `'error'` is special-cased in `EventEmitter` itself: if you `emit('error', ...)` and there is no `'error'` listener registered, `EventEmitter`'s internal logic throws the error itself, which (absent a process-level `'uncaughtException'` handler) crashes the process. It's a deliberate design choice to make error-handling non-optional for this one event name, in an otherwise fully generic, unenforced event system.

# Node Event Loop

The event loop is `uv_run()`—a C function, part of libuv, executed on the main thread. It is not a metaphorical device; it's a real, boundedly-simple loop that, per iteration, walks fixed phases and, for each, drains whatever's ready, computing a bounded poll timeout so it doesn't spin the CPU when there's nothing to do. Concretely, in libuv's own terms:

1. **Update the loop's cached time** (`uv_update_time`)—an optimization: syscalls like `gettimeofday`/`clock_gettime` aren't free, so libuv reads the clock once per iteration and reuses that value everywhere it needs "now" within the iteration, rather than re-syscalling for every timer check.
2. **Run due timers** (`uv__run_timers`): timers are stored in a **binary min-heap**, keyed by absolute expiry time, so "give me the next timer due" is an O(1) peek and inserting/removing is O(log n)—the right data structure when you may have thousands of live timers and need to repeatedly ask "what's next."
3. **Run pending callbacks** (`uv__run_pending`): certain callbacks deferred from the previous loop iteration—historically some TCP error callbacks—get their turn here.
4. **Idle/prepare handles**: internal-use handles, mostly not user-facing, that run every iteration regardless of whether there's I/O.
5. **Compute the poll timeout, then block on it** (`uv__io_poll`, wrapping `epoll_wait`/`kqueue`/IOCP as appropriate): this is the step that actually waits, and it's smarter than "wait forever" or "spin"—libuv computes the minimum of "time until the next timer is due" and "infinite if there are no timers and no other pending handles," so the loop's underlying poll syscall blocks efficiently instead of busy-waiting, but wakes up in time to service the next timer even if no I/O ever arrives.
6. **Check handles** (`uv__run_check`): `setImmediate()` callbacks fire here.
7. **Close callbacks** (`uv__run_closing_handles`): fired for handles closed via `uv_close()`, e.g. a socket or handle emitting `'close'`.
8. Then libuv decides whether to loop again, based on `uv_loop_alive()`—true if there are still active handles, active requests, or a nonzero `closing_handles` list. This is precisely the mechanism behind `.unref()`: an active `setInterval` normally keeps the process alive because it's a live handle; calling `.unref()` on it tells libuv "don't count this handle when deciding whether to keep looping," which is how you can have a background timer that doesn't prevent your script from exiting once everything else is done.

On top of and *between* every one of those phases (and between individual callbacks within the timer and check phases), V8's **microtask queue** is drained—this is a V8-level concept, not a libuv one, and it's why `process.nextTick` (a Node.js-specific, even-higher-priority queue processed before V8's promise microtask queue) and native Promise `.then()` callbacks both run before the loop is allowed to proceed to its next phase, no matter how "ready" a competing timer or I/O callback is.

Whenever an async task completes in libuv, the associated JS callback only actually executes once the call stack is empty—the normal flow of synchronous execution is never preempted to run a callback mid-flight. That single-threaded, run-to-completion guarantee for each JS callback (no other callback can interleave with a currently-running one) is, incidentally, why Node.js developers get away without most of the manual locking a systems programmer would otherwise reach for when sharing state across concurrent units of work: within one event loop, there's no true parallel mutation of shared JS state to race on. (This guarantee stops applying the moment you bring in `worker_threads` with `SharedArrayBuffer`s—now you do have real parallelism and real races, and need `Atomics` accordingly.)

## Phases, precisely

### Microtask queues

Drained between every phase, and between each individual callback in the timer/check phases.

1. `process.nextTick` queue — Node.js-specific, highest priority, processed to *exhaustion* before the promise queue even starts.
```js
process.nextTick(() => console.log("this is process.nextTick()"));
```
Careless recursive `process.nextTick()` calls starve the loop entirely—since this queue must fully drain before the loop proceeds, an unbounded chain of them means the timer, poll, check, and close phases never get a turn, and I/O for the entire process appears to hang.

2. Promise microtask queue — V8-level, standard per the ECMAScript spec, not Node-specific.
```js
Promise.resolve().then(() => console.log("this is a promise"));
```

### Timer phase — `uv__run_timers`
Backed by a binary min-heap on expiry time; due timers run in expiry order.
```js
setTimeout(() => console.log("this is a timer callback"), 0);
```

### Poll (I/O) phase — `uv__io_poll`
Wraps `epoll_wait`/`kqueue`/IOCP. Socket and pipe callbacks land here once the kernel reports readiness; threadpool completions (`fs.readFile`, etc.) are delivered back to this same iteration via the `uv_async_t` wake mechanism described above.

### Check phase — `uv__run_check`
```js
setImmediate(() => console.log("setImmediate function for check phase"));
```
Designed specifically to run *immediately after* the poll phase in the same iteration—this is why `setImmediate` inside an I/O callback is deterministically ordered before a `setTimeout(fn, 0)` scheduled at the same point: the check phase for that iteration is guaranteed to run before the next iteration's timer phase.

### Close callbacks phase — `uv__run_closing_handles`
Fired from `uv_close()` on handles—sockets, timers, or anything else you can call `.close()`/let get garbage-collected via `.unref()`.

## Execution order, traced at the instruction level

```js
console.log('1: start');
setTimeout(() => console.log('2: timeout'), 0);
Promise.resolve().then(() => console.log('3: promise'));
process.nextTick(() => console.log('4: nextTick'));
console.log('5: end');
```

Walking it against the actual mechanics above: `1: start` and `5: end` execute synchronously on the call stack—nothing about the event loop is even consulted yet, since the stack isn't empty. `setTimeout` inserts a node into libuv's timer min-heap with expiry `now + 0ms`, and returns immediately without running anything. `Promise.resolve().then(...)` schedules a V8 microtask. `process.nextTick(...)` schedules onto Node's separate, higher-priority nextTick queue. Once the synchronous script finishes and the call stack empties, V8/Node drain microtasks before the loop is permitted to advance to the timer phase at all: nextTick queue first (`4: nextTick`), then the promise queue (`3: promise`). Only then does `uv_run` proceed into `uv__run_timers`, find the (already-expired, since 0ms elapsed) timer, and fire it (`2: timeout`):

```
1: start
5: end
4: nextTick
3: promise
2: timeout
```

The general principle: **the call stack always fully unwinds before any queue is serviced, microtasks always fully drain before any macrotask (timer/I/O/check) phase runs, and nextTick always drains before the promise microtask queue.** All three of those are separate priority guarantees, enforced at separate layers (V8 for promises, Node.js's bindings for `nextTick`, libuv for phase ordering), which is exactly why the mental model needs three distinct queues rather than one.

## Where the real engineering trade-offs live

A few things that separate "I can use async/await" from actually reasoning about this as a systems problem:

- **Backpressure is a real, syscall-adjacent concern, not just an API detail.** `stream.write()` returns `false` when the internal buffer exceeds `highWaterMark`, at which point you're expected to wait for `'drain'` before writing more. Ignore it and you're buffering unbounded data in process memory because the consumer (a socket, a file) can't keep up with the producer—this is precisely the same backpressure problem you'd reason about with a bounded ring buffer between producer/consumer threads in any other systems context; Node.js just surfaces it as an event instead of a blocking write.
- **The threadpool size is a real capacity-planning knob**, not an obscure env var. Four threads (default) means at most four filesystem/DNS/crypto operations can be *in flight* concurrently regardless of how many `fs.readFile()` calls you queue—the fifth call's work item just sits in libuv's internal queue until a worker frees up. Under filesystem-heavy load, `UV_THREADPOOL_SIZE` is a lever that actually moves throughput; under socket-heavy load (epoll-driven), it does essentially nothing, because that path never touches the pool.
- **V8 itself has its own internals worth knowing about**, independent of the event loop: it compiles your JS through a fast, unoptimized baseline interpreter (Ignition) first, then promotes ("tiers up") hot functions to an optimizing JIT (TurboFan) once it's collected enough type feedback via inline caches to make aggressive assumptions about the shapes of your objects; it also runs a generational garbage collector—a fast scavenger for the young generation, a slower mark-and-sweep/compact for the old generation—and heap layout decisions (monomorphic vs. polymorphic property access, "hidden classes" changing shape) affect real throughput in ways that show up in profiling long before the event loop itself is your bottleneck.
- **`.ref()`/`.unref()` is the process-liveness API most people never touch**, and it's directly downstream of `uv_loop_alive()`'s bookkeeping described above—a handle you `.unref()` doesn't count toward "should the process keep running," which is exactly how you write a background heartbeat timer that doesn't prevent a CLI tool or script from exiting cleanly once its actual work is done.

## Where things stand now (2026)

None of the mechanics above have changed—`uv_run`'s phase structure, the timer min-heap, the threadpool's mutex/condvar work queue, epoll/kqueue/IOCP as the socket backends, are all the same design as when this post was first written. What's changed is the surface API and the current release lineup: Node.js 24 is the current Active LTS line, Node.js 22 is in Maintenance LTS, and Node.js 26 is on the "Current" line ahead of entering LTS later this year. Worth knowing:

- **`fetch` is built in**, backed by Undici, Node's own HTTP client implementation—no more `node-fetch`.
- **A built-in test runner** (`node --test`) exists if you want to avoid a Jest/Mocha dependency.
- **`--watch`** gives you nodemon-equivalent restart-on-change behavior natively.
- **The permission model (`--permission`)** is stable, letting you sandbox what a process can touch at the filesystem/network/child-process level—enforced at the Node.js binding layer, before a syscall like `open()` is even attempted.
- **ESM/CJS interop** is considerably less painful than it was in 2023.

None of that changes anything about the event loop or `EventEmitter` mechanics described above—it's the same runtime, same libuv, same epoll/kqueue/IOCP split underneath. It's just got a friendlier API surface than it did when I first wrote this.

## References

1. [Node.js Official Docs](https://nodejs.org/en/docs)
2. [Node.js Event Loop docs](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
3. [libuv design overview](https://docs.libuv.org/en/v1.x/design.html)
4. [libuv source, GitHub](https://github.com/libuv/libuv)

[^1]: Blocking I/O has to do with data fetch outside RAM from disk, network or other processes and takes a lot of CPU cycles, unlike non-blocking I/O which has to do with data fetch from CPU caches or at most RAM and takes fewer CPU cycles.
