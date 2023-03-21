In this post, I go into quite a bit of detail about what I've learned about Processes and Threads.

## In the beginning...

Early computers were programmed without the program stored. That is, to run a different program meant reprogramming the computer for just that specific task. This even had to do with modifying hardware like the circuitry or adjusting some physical controls.

### Stored Program Computer

With rapid development and innovations came the idea of a stored program computer which expresses a computer program as a sequence of coded instructions. Memory holds both data and instrucions. The CPU fetches, interprets and executes successive instructions of the program. The two major models of this idea are the von Neuman Architecture and Havard Architecture.

## A world of Abstractions.

One of the most ubitiqous concepts in computer science and software engineering is the idea of abstraction. It is in fact, a very commonly used term in the world of software. But what is abstraction?
Abstraction can mean many things to different people, but a quite astounding explanation (or definition if you like) of abstraction can be found in this [blog post](https://the.scapegoat.dev/why-i-am-learning-category-theory-1/). Abstraction is defined as:

> "...a controlled form of forgetting the details to focus on something more fundamental, allowing one to make statements that are shorter to state, yet broader in meaning"

I consider that a very excellent description of what abstraction is. This is very true of abstraction at every level of the software stack. We use web APIs without understanding the details or caring much about what's going on behind the scenes, we talk about computers fectching data from memory in a straighforward manner without considering much fine-grained details like memory heirarchy with it's attendant concepts (like caching, catch hits and misses, cache lines), memory paging and allocations, paged I/O operations on disks, etc,etc... We just simply talked about these "high-level" operations without paying much attention to the details. We often talk about leaky abstractions if, in an attempt to look at these high-level stuffs, we begin to delve too much into the details.

I've had to talk about abstraction because the idea of processes and threads are very good abstractions we have to deal with as computer programmers.


## Programs and Processes
A program is an executable file that contains a list of all the instruction needed to perform a task in a computer. When the task (the executable file or program) is running, that is, being executed by the processor, it is referred to as a process.

A program lists the instructions; a process executes the instructions.The ides of a process is a fundamental abstraction provided by the operating system (OS) in modern computing. A computer program is a passive collection of instructions typically stored in a file on disk. A process is the execution of those instructions after being loaded from disk to memory. Several process can be associated with the same program. A thread is the smallest sequence of instructions that can be independently managed by a scheduler<sup>1</sup>. Multiple threads can exist within one process and share it's resources<sup>2</sup> such as memory, code, sockets, etc. Different processes do not share these resources, hence, process don't directly communicate with each other--and we speak of interprocess communication [(IPC)]().

The relation between a process and a program is like the relationship between a class and an object or the relationship between an interface and an implementation.

A nice illustration that helps me in thinking properly of the relationship between a program and a process is that of an orchestra. An orchestra plays a musical piece. As a matter of fact, it's the musical piece they are in a stage for. The musical piece is just like a program; on it's own it is passive. But when it is being played (executed), it has meaning. The passive musical piece when it's being played is just like a process.

### Threads
A thread is a sequential execution stream within a process. A process can either be single-threaded or multithreaded. By single threaded, we mean the program has just one sequential path of execution. Multithread has to do with multiple paths of execution of the program, that is, many parts working together to fulfil a goal. Threads in a process share the same address space, hence, there is a need for synchronization. As long as we have a single active thread within a process, this process is still alive. A process with no thread cannot exist (since a thread is the unit of program execution).

## Etymological Nuances.
The word process have been used to mean a different thing in other contexts, the foremost I know of is in Tony Hoare's Communication Sequential Processes [(CSP)](https://en.wikipedia.org/wiki/Communicating_sequential_processes) paper. Process as used by him referred to unit of (concurrent) computation. It is a concurrency primitive. Many programming languages whose memory models have been totally or partially based on CSP model have come to use different terminologies to refer to these processes. Such terminologies include goroutines and channels (in Golang), actors (erlang), etc.

For instance, in Go's doc FAQs page, it is stated that the concurrency model is based on the idea of CSP:

>One of the most successful models for providing high-level linguistic support for concurrency comes from Hoare's Communicating Sequential Processes, or CSP. Occam and Erlang are two well known languages that stem from CSP. Go's concurrency primitives derive from a different part of the family tree whose main contribution is the powerful notion of channels as first class objects. Experience with several earlier languages has shown that the CSP model fits well into a procedural language framework. 

On goroutines:

>Goroutines are part of making concurrency easy to use. The idea, which has been around for a while, is to multiplex independently executing functions—coroutines—onto a set of threads. When a coroutine blocks, such as by calling a blocking system call, the run-time automatically moves other coroutines on the same operating system thread to a different, runnable thread so they won't be blocked. The programmer sees none of this, which is the point.

#### Green Threads
The idea of green threads was popularized by the Java programming language. They are scheduled and managed by the Java Virtual Machine (JVM) which is it's runtime and not by the operating system, hence, they can operate in environment with no native support for threading. Green threads are user space threads, hence, they are not managed by the operating system. The OS only sees the JVM as a single process and a single thread.

These concurrency primitives are quite different from native threads in that they can only achieve concurrency, whereas native threads can acheive parallelism.

## Programming

Several non-trivial computer programming languages provide APIs and mechanisms for working with native threads and spawning new processes at a high level of abstraction. Python for instance have modules for multiprocessing and multithreading. Example code: 

```py
from multiprocessing import Process

def f(name):
    print('hello', name)

if __name__ == '__main__':
    p = Process(target=f, args=('bob',))
    p.start()
    p.join()
```

## Related Stuffs.
### Hyper-threading.
Hyper-threading happens at the lowest level of abstraction to the programmer. In modern multi-core CPUs, each physical core in the CPU is divided into two virtual cores (or better put, logical cores) that are treated and actually used by the operating system. Hence, a system can have 4 physical cores (quad-core) and 8 logical cores (of execution) through hyper-threading.


## References

 > 1. A scheduler is like a management layer. It is part of the operating system or (runtime for userspace threads) that carries out the scheduling activity for program execution (processing). By keeping all the computer resources busy, it ensures efficient distribution of the processor time among many threads. It assigns prioritizations to use threads according to set rules.
 > 2. A system resource is anything needed for the functioning of computer programs. This include memory, CPU, files, network connections (sockets), caches, interupt request lines (IRQ), etc.
