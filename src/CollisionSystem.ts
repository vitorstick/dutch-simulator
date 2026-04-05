import * as THREE from 'three';
import { Player }     from './Player';
import { NPC }        from './NPC';
import { FatBikeNPC } from './FatBikeNPC';
import { NPCManager } from './NPCManager';

/**
 * Module-level pre-allocated `Box3` instances reused every frame to avoid
 * per-frame heap allocation during AABB checks.
 */
const _playerBox = new THREE.Box3();
const _npcBox    = new THREE.Box3();

/**
 * Performs per-frame Axis-Aligned Bounding Box (AABB) collision detection
 * between the player and all currently-alive NPCs.
 *
 * The player's bounding box is shrunk slightly (`expandByScalar(-0.12)`) so
 * that grazing contacts — where only mesh extremities overlap — are ignored,
 * keeping the feel fair.
 *
 * @param player  - The player instance whose mesh is used for the bounding box.
 * @param manager - The NPC manager; only live NPCs are tested.
 * @returns Array of NPCs whose bounding boxes intersect the player this frame.
 *          The caller is responsible for calling `manager.hitNPC(npc)` on each
 *          result and updating the score.
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

/**
 * Performs per-frame AABB collision detection between the player and all
 * fat-bike NPCs that are off hit-cooldown.
 *
 * Unlike pedestrian collisions, a fat-bike hit damages the **player** (loses
 * one life). The fat bike itself is unaffected and keeps riding.
 *
 * @param player  - The player instance.
 * @param manager - The NPC manager supplying fat-bike candidates.
 * @returns Array of fat bikes that are currently colliding with the player and
 *          are ready to deal damage. The caller must call `bike.onHitPlayer()`
 *          on each result and deduct the life from `ScoreManager`.
 */
export function checkFatBikeCollisions(player: Player, manager: NPCManager): FatBikeNPC[] {
  _playerBox.setFromObject(player.mesh);
  _playerBox.expandByScalar(-0.12);

  const hits: FatBikeNPC[] = [];
  for (const bike of manager.getLiveFatBikes()) {
    if (!bike.canHitPlayer) continue;
    _npcBox.setFromObject(bike.mesh);
    if (_playerBox.intersectsBox(_npcBox)) {
      hits.push(bike);
    }
  }
  return hits;
}
