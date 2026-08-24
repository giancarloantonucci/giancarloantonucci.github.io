---
title: Bohmian Mechanics
description: >-
  An account of the de Broglie–Bohm interpretation of quantum mechanics, worked
  through the double-slit experiment.
---

## Introduction

According to the Copenhagen interpretation of quantum mechanics, particles do not have locations until they are observed. Another interpretation, due to Louis de Broglie [4] and David Bohm [2, 3], provides an alternative view in which particles have precise positions at all times.

Let $q(t)$ denote the configuration of a physical system, i.e. particles, $Q$ be its configuration space and $\psi(q,t)$ be the wave function underlying such a system. According to this theory, both wave and particles actually exist as separate entities. We characterise the time evolution of a physical system according to a set of two equations: the Schrödinger equation

<div class="math">
\begin{equation} \label{eq:schrodinger}
i\hbar \pdv{\psi}{t} = H\psi,
\end{equation}
</div>

where $H$ is the Hamiltonian operator, and the guidance equation

<div class="math">
\begin{equation}
\dv{q}{t} = v^\psi(q),
\end{equation}
</div>

where $v^\psi = J/\rho$ is a velocity field that can be obtained from the Schrödinger equation itself through the quantum probability density $\rho = \inner{\psi}{\psi}$ and the quantum probability current $J$ [5].

For a non-relativistic system of $N$ particles, each of mass $m_i$, moving subject to a potential $V(r,t)$, the Hamiltonian writes as

<div class="math">
\begin{equation}
H = \sum_{i=1}^N \frac{p_i^2}{2m_i} + V = - \sum_{i=1}^N \frac{\hbar^2}{2m_i} \nabla_i^2 + V,
\end{equation}
</div>

where $p_i = -i\hbar\grad_i$ denotes the momentum ascribed to the coordinates of the $i$-th particle. Similarly, the guidance equation becomes

<div class="math">
\begin{equation} \label{eq:guidance}
\dv{r_i}{t} = \frac{1}{m_i} \, \Re{\left( \frac{\inner{\psi}{p_i\psi}}{\inner{\psi}{\psi}} \right)} = \frac{\hbar}{m_i} \, \Im{\left( \frac{\inner{\psi}{\grad_i{\psi}}}{\inner{\psi}{\psi}} \right)}.
\end{equation}
</div>

An immediate consequence of \eqref{eq:guidance} is that quantum trajectories do not cross each other: if they had, two particles would have shared the same point, making the wave function multi-valued at that point.

## The double-slit experiment

One advantage of this theory is that it resolves the dilemma of wave-particle duality in the double-slit experiment. In this experiment, a source sends a stream of particles, e.g. electrons, towards a pair of narrow slits. After the passage through the slits, the particles reach a photographic plate, leaving a black spot. After a while, these spots start to form an interference pattern on the screen, as if the particles were (or behaved as) waves. Note that this happens even if we send one particle at a time.

Our model is as follows. Since the Schrödinger equation is linear, we assume that the incident wave function comes out of the slits as a superposition of two Gaussian wave packets, which then propagate forward. We can use other wave packets, e.g. Airy functions, which propagate freely without envelope dispersion [1], but the end result does not change substantially. Hence, for the $j$-th slit, our problem reads as

<div class="math">
\begin{equation}
\begin{cases}
i\hbar \pdv{\psi_j}{t} = -\frac{\hbar^2}{2m} \left( \pdvn{\psi_j}{x}{2} + \pdvn{\psi_j}{y}{2} \right), & (x, t) \in \RR \times [0, \infty], \\
\psi_j(x, y, 0) = \exp{\left[ -\frac{(y-y_j)^2}{2\sigma^2} + ikx \right]}, & t = 0, \\
\psi_j(x, y, t) \to 0, & x, y \to \pm\infty.
\end{cases}
\end{equation}
</div>

Separation of variables and a standard application of the Fourier transform give that

<div class="math">
\begin{equation}
\psi_j(x,y,t) = \frac{\sigma}{\sigma_t} \, \exp{\left[ -\frac{(y-y_j)^2}{2\sigma_t^2} + i \left(kx - \frac{\hbar k^2}{2m}t\right) \right]},
\end{equation}
</div>

with

<div class="math">
\begin{equation}
\sigma_t := \sqrt{\sigma^2 + i\frac{\hbar}{m}t} \,.
\end{equation}
</div>

Hence, we substitute $\psi = \psi_1 + \psi_2$ into the guiding equation to obtain $x = kt$ and

<div class="math">
\begin{equation}
\dv{y}{t} = \Im{\left( \frac{1}{\psi} \pdv{\psi}{y} \right)} = \Im{\left[ \frac{(y_1 - y) \, \psi_1 + (y_2 - y) \, \psi_2}{\sigma_t^2 \, (\psi_1 + \psi_2)} \right]},
\end{equation}
</div>

which we solve using the classic fourth-order Runge–Kutta scheme from [`RungeKutta.jl`](https://github.com/antonuccig/RungeKutta.jl) whilst setting $\hbar = m = k = 1$ and $\sigma = 0.225$:

```julia
using RungeKutta
problem = DoubleSlit2D(σ = 0.225)
solver = RK4(h = 1e-3)
solution = solve(problem, solver)
```

As it turns out, the slits cause the guiding wave to form an interference pattern, which in turn determines the possible trajectories of each particle.

<figure>
  <img src="../assets/images/figures/double-slit.svg" alt="Particle trajectories and the resulting distribution for the double-slit experiment">
  <figcaption><b>Figure 1.</b> Left: particle trajectories for the double-slit experiment. Right: (non-normalised) quantum equilibrium distribution at the photographic plate.</figcaption>
</figure>

## References

1. M. V. Berry and N. L. Balázs, *Nonspreading wave packets*, American Journal of Physics, 47(3):264–267, 1979. [[doi]](https://doi.org/10.1119/1.11855)
2. D. Bohm, *A suggested interpretation of the quantum theory in terms of "hidden" variables I*, Physical Review, 85(2):166–179, 1952. [[doi]](https://doi.org/10.1103/PhysRev.85.166)
3. D. Bohm, *A suggested interpretation of the quantum theory in terms of "hidden" variables II*, Physical Review, 85(2):180–193, 1952. [[doi]](https://doi.org/10.1103/PhysRev.85.180)
4. L. de Broglie, *La mécanique ondulatoire et la structure atomique de la matière et du rayonnement*, Journal de Physique et le Radium, 8(5), 1927. [[doi]](https://doi.org/10.1051/jphysrad:0192700805022500)
5. D. Dürr, S. Goldstein and N. Zanghì, *Quantum Physics without Quantum Philosophy*, Springer-Verlag Berlin Heidelberg, 2013. [[doi]](https://doi.org/10.1007/978-3-642-30690-7)
