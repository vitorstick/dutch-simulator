import * as THREE from 'three';
import { Player }     from './Player';
import { NPC }        from './NPC';
import { NPCManager } from './NPCManager';

const _playerBox = new THREE.Box3();
const _npcBox    = new THREE.Box3();

/**
 * Returns NPCs that are newly intersecting the player this frame.
 * Caller is responsible for calling npcManager.hitNPC(npc) on each result.
 */
export function checkCollisions(player: Player, manager: NPCManager): NPC[] {
  _playerBox.setFromObject(player.mesh);
  _playerBox.expandByScalar(-0.12); // shrink slightly so grazing doesn't count

  const hits: NPC[] = [];
  for (const npc of manager.getLiveNPCs()) {
    _npcBox.setFromObject(npc.mesh);
    if (_playerBox.intersectsBox(_npcBox)) {
      hits.push(npc);
    }
  }
  return hits;
}
