---
title: Research
---

Conventional time-stepping is sequential: each step depends on the one before it, so a longer simulation cannot be made faster simply by adding processors. Time-parallel methods break that dependency and compute many points in time at once. My work is on making them work for chaotic systems, where small errors grow exponentially and the usual convergence arguments break down.

## Why chaos defeats parallel-in-time methods

[PLACEHOLDER] A paragraph on why parareal and its relatives converge poorly here — sensitivity to initial conditions, the coarse propagator losing the trajectory, what happens to the error over a long window.

## A moving-window algorithm

[PLACEHOLDER] What the algorithm does and why the moving window helps. Enough for a numerical analyst outside plasma physics to follow, without reproducing the paper.

## Finite-time convergence guarantees

[PLACEHOLDER] What can actually be proved, and over what horizon. The honest limits are more interesting than the result.

## Tokamak simulations

[PLACEHOLDER] What this buys in practice at UKAEA — which simulations, what scale, what the speed-up means for the physics rather than the benchmark.

Publications, talks and the full record are on the [CV](cv.html).
