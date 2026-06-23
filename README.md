# Simulation Lab

This repository is the home for interactive simulation projects that can be developed and published independently while sharing reusable code and assets over time.

## Structure

- `double-pendulum/` contains the current Vite + React + TypeScript simulation app
- `three-body/` contains the new Vite + React + TypeScript three-body gravity app
- `shared/` is reserved for reusable code, assets, notes, or deployment helpers shared across simulations
- the repository root is the npm workspace parent for simulation apps

## Current Simulations

- `double-pendulum`
- `three-body`

## Publishing Notes

- `double-pendulum` is configured to build for the subpath `/simulation-lab/double-pendulum/`
- `three-body` is configured to build for the subpath `/simulation-lab/three-body/`
- this matches a GitHub Pages layout where multiple simulations can live under the same repository site
