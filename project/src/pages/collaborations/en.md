---
title: Collaborations
---

## Transfinite Systems

Transfinite Systems is a software company specialized in satellite communications and coordination. As Earth's orbit shells become more and more crowded with satellites, they are interested in understanding how the probabilities of collisions between satellites on intersecting orbits become important, as shown by the 2009 Iridium-33 crash. Updating estimates of collision probabilities is important as new deployments are authorized, but it's difficult because only limited information about the deployment is needed to obtain permission.

In this study group, we demonstrated that, despite the lack of information, analytic estimates of collision probabilities relevant to the problem could be made. We carried out a survey of approaches reported in the literature, reviewing the 2009 Iridium-33 collision event. We showed how to derive a simple formula for the probability of a collision, exploiting small dimensionless numbers in the problem. We then extended our results to consider collisions involving orbits containing many satellites, aiming to find the optimal point at which to traverse such an orbit. As it turns out, there are circumstances under which, to minimize the probability of a collision, it is better not to aim to pass between the midpoint of two satellites.

## DSTL

DSTL is the research department of the UK's Ministry of Defence. They wanted to investigate methods for performing simultaneous transmission and detection of electromagnetic data streams on the same channels and the bounds on the performance that these could achieve. To achieve this, one must accurately model the components of the received signal that are reflections of previously outgoing signals sent on the same channel.

In this study group, we established that the solution to this problem lies in estimating the reflected signals caused by the outgoing signal. We defined the problem mathematically using an integral equation to represent the received signal. We then derived Cramer-Rao (lower) bounds for the error in estimating the outgoing signal, based on the error in the calculation of the reflected signal. We performed numerical simulations for a simple example to demonstrate some techniques that could be used for solving this problem.

## CrowdVision

CrowdVision sells software to monitor crowd levels in enclosed spaces, with their main installations being at large international airports. Their monitoring method relies on using computer vision from an array of overhead cameras to estimate occupancy levels, flow rates, and queueing times within certain prescribed areas. Since the ground truth can be difficult to establish, it's difficult to assess the accuracy of their system. Similarly, human counting is prone to error, even when using video recordings with no time constraints and the support of sophisticated software.

In this study group, we considered what errors could arise from the images recorded by the cameras, due to both occlusion of people and image distortion due to a fisheye lens. We also developed a statistical model of human counting errors and attempted to estimate human accuracy from data. Finally, we attempted to relate human and computer accuracy based on simplifying statistical approximations.
