---
title: Math test
date: 2020-01-01
excerpt: Scratch post for testing KaTeX math rendering.
# draft: true
---

Inline with underscores: $x_i + y_j = z_{max}$ and asterisks: $a*b*c$.

Inline with common notation: quorum is $\lceil (n+1)/2 \rceil$, latency is $O(\log n)$, and $\sum_{i=1}^{n} x_i$.

Display block:

$$
f(x) = \frac{1}{\sigma\sqrt{2\pi}} e^{-\frac{(x-\mu)^2}{2\sigma^2}}
$$

Display with alignment-heavy content:

$$
\mathcal{L}(\theta) = \mathbb{E}_{x \sim p(x)} \left[ \| x - g_\theta(f_\theta(x)) \|^2 \right]
$$

Bracket delimiters also work: \(a^2 + b^2 = c^2\) inline, and

\[
\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
\]

Money that must NOT become math: it costs $5 and $10 total.

Code must stay untouched: `echo $HOME` and:

```bash
export PATH=$PATH:$HOME/bin
```
