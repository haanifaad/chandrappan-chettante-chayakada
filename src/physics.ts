import * as THREE from 'three';
import { terrainHeight } from './world';

export interface ColliderBox {
  id: string;
  min: THREE.Vector3;
  max: THREE.Vector3;
  isFloor?: boolean;
  floorY?: number;
  isTrigger?: boolean;
  tag?: string;
}

export interface ColliderCylinder {
  id: string;
  center: THREE.Vector2;
  radius: number;
  minY: number;
  maxY: number;
  tag?: string;
}

export interface RayHit {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  colliderId: string;
}

/**
 * Lightweight, robust 3D physics and collision manager.
 * Supports heightfield terrain, walkable surfaces/plinths, step climbing,
 * swept box/capsule obstacle sliding, and camera raycasting.
 */
export class PhysicsWorld {
  private boxes: ColliderBox[] = [];
  private cylinders: ColliderCylinder[] = [];
  private static instance: PhysicsWorld | null = null;

  static getInstance(): PhysicsWorld {
    if (!PhysicsWorld.instance) {
      PhysicsWorld.instance = new PhysicsWorld();
    }
    return PhysicsWorld.instance;
  }

  clear() {
    this.boxes = [];
    this.cylinders = [];
  }

  addBox(box: ColliderBox) {
    this.removeBox(box.id);
    this.boxes.push(box);
  }

  removeBox(id: string) {
    this.boxes = this.boxes.filter((b) => b.id !== id);
  }

  addCylinder(cyl: ColliderCylinder) {
    this.removeCylinder(cyl.id);
    this.cylinders.push(cyl);
  }

  removeCylinder(id: string) {
    this.cylinders = this.cylinders.filter((c) => c.id !== id);
  }

  /**
   * Sample true walkable ground height at (x, z), considering terrain
   * plus any walkable floor slabs/plinths/steps below current character feet.
   */
  getGroundHeight(x: number, z: number, currentFeetY = 0): number {
    let ground = terrainHeight(x, z);

    for (const b of this.boxes) {
      if (b.isFloor && x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z) {
        const top = b.floorY ?? b.max.y;
        // Accept floor if character is near or above it (within step height of 0.45m)
        if (top > ground && currentFeetY >= top - 0.45) {
          ground = top;
        }
      }
    }
    return ground;
  }

  /**
   * Checks whether a character cylinder at (x, y, z) with given radius and height
   * overlaps any solid obstacles.
   */
  isBlocked(x: number, y: number, z: number, radius: number, height: number, ignoreFloor = true): boolean {
    const feetY = y;
    const headY = y + height;

    for (const b of this.boxes) {
      if (b.isTrigger) continue;
      if (b.isFloor && ignoreFloor) continue;

      // Check vertical overlap
      if (feetY >= b.max.y || headY <= b.min.y) continue;

      // Check horizontal AABB expanded by cylinder radius
      if (
        x > b.min.x - radius &&
        x < b.max.x + radius &&
        z > b.min.z - radius &&
        z < b.max.z + radius
      ) {
        return true;
      }
    }

    for (const c of this.cylinders) {
      if (feetY >= c.maxY || headY <= c.minY) continue;
      const dx = x - c.center.x;
      const dz = z - c.center.y;
      const distSq = dx * dx + dz * dz;
      const r = radius + c.radius;
      if (distSq < r * r) {
        return true;
      }
    }

    return false;
  }

  /**
   * Resolve character movement with step climbing and axis-sliding.
   */
  resolveMovement(
    currentPos: THREE.Vector3,
    velocity: THREE.Vector3,
    dt: number,
    radius: number,
    height: number,
    stepHeight = 0.38,
  ): { newPos: THREE.Vector3; collidedX: boolean; collidedZ: boolean } {
    const target = currentPos.clone().addScaledVector(velocity, dt);
    const p = currentPos.clone();
    let collidedX = false;
    let collidedZ = false;

    const dx = target.x - p.x;
    const dz = target.z - p.z;

    // First try moving on X axis
    if (Math.abs(dx) > 1e-5) {
      const testX = p.x + dx;
      const testGroundX = this.getGroundHeight(testX, p.z, p.y);
      const stepDiffX = testGroundX - p.y;

      if (stepDiffX <= stepHeight && !this.isBlocked(testX, Math.max(p.y, testGroundX), p.z, radius, height)) {
        p.x = testX;
        if (stepDiffX > 0) p.y = testGroundX;
      } else {
        collidedX = true;
      }
    }

    // Next try moving on Z axis
    if (Math.abs(dz) > 1e-5) {
      const testZ = p.z + dz;
      const testGroundZ = this.getGroundHeight(p.x, testZ, p.y);
      const stepDiffZ = testGroundZ - p.y;

      if (stepDiffZ <= stepHeight && !this.isBlocked(p.x, Math.max(p.y, testGroundZ), testZ, radius, height)) {
        p.z = testZ;
        if (stepDiffZ > 0) p.y = testGroundZ;
      } else {
        collidedZ = true;
      }
    }

    return { newPos: p, collidedX, collidedZ };
  }

  /**
   * Cast a ray against solid boxes to prevent camera or sight line from passing through walls/roofs.
   */
  raycast(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): RayHit | null {
    const normDir = dir.clone().normalize();
    let closestDist = maxDist;
    let hit: RayHit | null = null;

    const invDir = new THREE.Vector3(
      normDir.x !== 0 ? 1 / normDir.x : Infinity,
      normDir.y !== 0 ? 1 / normDir.y : Infinity,
      normDir.z !== 0 ? 1 / normDir.z : Infinity,
    );

    for (const b of this.boxes) {
      if (b.isTrigger) continue;

      let tmin = (b.min.x - origin.x) * invDir.x;
      let tmax = (b.max.x - origin.x) * invDir.x;
      let nmin = new THREE.Vector3(-Math.sign(normDir.x), 0, 0);

      if (tmin > tmax) {
        const tmp = tmin;
        tmin = tmax;
        tmax = tmp;
        nmin.set(Math.sign(normDir.x), 0, 0);
      }

      let tymin = (b.min.y - origin.y) * invDir.y;
      let tymax = (b.max.y - origin.y) * invDir.y;
      let nymin = new THREE.Vector3(0, -Math.sign(normDir.y), 0);

      if (tymin > tymax) {
        const tmp = tymin;
        tymin = tymax;
        tymax = tmp;
        nymin.set(0, Math.sign(normDir.y), 0);
      }

      if (tmin > tymax || tymin > tmax) continue;

      if (tymin > tmin) {
        tmin = tymin;
        nmin = nymin;
      }
      if (tymax < tmax) {
        tmax = tymax;
      }

      let tzmin = (b.min.z - origin.z) * invDir.z;
      let tzmax = (b.max.z - origin.z) * invDir.z;
      let nzmin = new THREE.Vector3(0, 0, -Math.sign(normDir.z));

      if (tzmin > tzmax) {
        const tmp = tzmin;
        tzmin = tzmax;
        tzmax = tmp;
        nzmin.set(0, 0, Math.sign(normDir.z));
      }

      if (tmin > tzmax || tzmin > tmax) continue;

      if (tzmin > tmin) {
        tmin = tzmin;
        nmin = nzmin;
      }
      if (tzmax < tmax) {
        tmax = tzmax;
      }

      if (tmin >= 0 && tmin < closestDist) {
        closestDist = tmin;
        hit = {
          point: origin.clone().addScaledVector(normDir, tmin),
          normal: nmin,
          distance: tmin,
          colliderId: b.id,
        };
      }
    }

    return hit;
  }
}
