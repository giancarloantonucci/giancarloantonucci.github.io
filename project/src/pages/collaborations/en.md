---
title: Collaborations with industry
---

During my time at the [Centre for Doctoral Training in Industrially Focused Mathematical Modelling](https://www.maths.ox.ac.uk/study-here/postgraduate-study/industrially-focused-mathematical-modelling-epsrc-cdt), I worked with businesses to solve complex problems in commercial settings. These collaborations benefit both sides: companies cut operating costs and workloads, while mathematicians tackle interesting research questions.

## Transfinite Systems

Transfinite Systems develops satellite communications and coordination software. As Earth’s orbits become more crowded, the company is modelling collision risks on intersecting paths, a hazard highlighted by the 2009 Iridium-33 crash. Updating these risk estimates is difficult because regulators authorize new deployments while requiring very little data.

Our study group demonstrated how to make analytic collision estimates despite sparse data. After reviewing the literature on the 2009 Iridium-33 crash, we derived a simple formula for collision probability by exploiting small dimensionless numbers. We then extended this model to multi-satellite orbits to find the safest point to traverse them. Surprisingly, we found that under certain conditions, avoiding the midpoint between two satellites can minimize collision risk.

## DSTL

DSTL is the research department of the UK's Ministry of Defence. They wanted to investigate methods for performing simultaneous transmission and detection of electromagnetic data streams on the same channels and the bounds on the performance that these could achieve. To achieve this, one must accurately model the components of the received signal that are reflections of previously outgoing signals sent on the same channel.

In this study group, we established that the solution to this problem lies in estimating the reflected signals caused by the outgoing signal. We defined the problem mathematically using an integral equation to represent the received signal. We then derived Cramer-Rao (lower) bounds for the error in estimating the outgoing signal, based on the error in the calculation of the reflected signal. We performed numerical simulations for a simple example to demonstrate some techniques that could be used for solving this problem.

## CrowdVision

CrowdVision sells software to monitor crowd levels in enclosed spaces, with their main installations being at large international airports. Their monitoring method relies on using computer vision from an array of overhead cameras to estimate occupancy levels, flow rates, and queueing times within certain prescribed areas. Since the ground truth can be difficult to establish, it's difficult to assess the accuracy of their system. Similarly, human counting is prone to error, even when using video recordings with no time constraints and the support of sophisticated software.

In this study group, we considered what errors could arise from the images recorded by the cameras, due to both occlusion of people and image distortion due to a fisheye lens. We also developed a statistical model of human counting errors and attempted to estimate human accuracy from data. Finally, we attempted to relate human and computer accuracy based on simplifying statistical approximations.
