import Phaser from 'phaser';
import './style.css';
import { gameConfig } from './game/config/gameConfig';
import { playablesLifecycle } from './game/services/PlatformServices';

window.addEventListener('contextmenu', (event) => event.preventDefault());

const game = new Phaser.Game(gameConfig);
playablesLifecycle.bind(game);
