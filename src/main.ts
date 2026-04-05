/**
 * Application entry point.
 *
 * Imports the global stylesheet then instantiates `Game`, which owns all
 * subsystems and drives the render loop via `requestAnimationFrame`.
 */
import './style.css';
import { Game } from './Game';

new Game();
