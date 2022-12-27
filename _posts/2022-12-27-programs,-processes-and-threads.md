In this post, i give a quite an extensive discourse on what I've learnt on Process and Thread.

## In he beginning...

I was not born then--but computer history has it that--computers were programmed without the program stored. That is, to run a different program meant reprogramming the computer for just that specific task. This even had to do with modifying hardware like the circuitry or adjusting some physical controls.

### Stored Program Computer

With rapid development and innovations came the idea of a stored program computer which expresses a computer program as a sequence of coded instructions. Memory holds both data and instrucions. The CPU fetches, interprets and executes successive instructions of the program. The two major models of this idea are the von Neuman Architecture and Havard Architecture.

## A world of Abstractions.

One of the most ubitiqous concepts in computer science and software engineering is the idea of abstraction. It is in fact, a very commonly used term in the world of software. But what is abstraction?
Abstraction can mean many things to different people, but a quite astounding explanation (or definition if you like) of abstraction can be found in this [blog post](https://the.scapegoat.dev/why-i-am-learning-category-theory-1/). Abstraction was defined as:

> "...a controlled form of forgetting the details to focus on something more fundamental, allowing one to make statements that are shorter to state, yet broader in meaning"



## Programs and Processes

A program lists the instructions; a process executes the instructions.The ides of a process is a fundamental abstraction provided by the operating system (OS) in modern computing. A computer program is a passive collection of instructions typically stored in a file on disk. A process is the execution of those instructions after being loaded from disk to memory. Several process can be associated with the same program. A thread is the smallest sequence of instructions that can be independently managed by a scheduler<sup>1</sup>. Multiple threads can exist within one process and share it's resources<sup>2</sup> such as memory. Different processes do not share these resources, hence, process don't directly communicate with each other.

The relation between a process and a program is like the relationship between a class and an object or the relationship between an interface and an implementation.

## Threads
A thread is a sequential execution stream within a process. A process can either be single-threaded or multithreaded. By single threaded, we mean the program has just one sequential path of execution. Multithread has to do with multiple paths of execution of the program, that is, many parts working together to fulfil a goal. Threads in a process share the same address space, hence, there is a need for synchronization. As long as we have a single active thread within a process, this process is still alive. A process with no thread cannot exist (since a thread is the unit of program execution).

## Programming

Most non-trivial computer programming languages provide APIs and mechanisms for us to work with processes and threads at a high level of abstraction. Python for instance have modules for multiprocessing and threading. Example code: 

```python
from multiprocessing import Process

def f(name):
    print('hello', name)

if __name__ == '__main__':
    p = Process(target=f, args=('bob',))
    p.start()
    p.join()
```

## References

 > 1. A scheduler is like a management layer. It is part of the operating system that carries out the scheduling activity for program execution (processing). By keeping all the computer resources busy, it ensures efficient distribution of the processor time among many threads. It assigns prioritizations to use threads according to set rules.
 > 2. A system resource is anything needed for the functioning of computer programs. This include memory, CPU, files, network connections (sockets), caches, interupt request lines (IRQ), etc.
