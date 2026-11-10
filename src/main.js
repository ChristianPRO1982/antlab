import './style.css';
import { SparseWorld } from './world.js';
import { mountPaving } from './paving-view.js';

const status = document.querySelector('[role="status"]');
try {
  mountPaving(document.querySelector('canvas'), status, new SparseWorld());
} catch (error) {
  status.textContent = `Impossible d’afficher le pavage : ${error.message}`;
  console.error(error);
}
