import Phaser from 'phaser';
import './style.css';
import { gameConfig } from './game/config/gameConfig';

window.addEventListener('contextmenu', (event) => event.preventDefault());

new Phaser.Game(gameConfig);
