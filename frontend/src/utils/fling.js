/**
 * Where a flick would come to rest: velocity (pt/s) projected with a
 * deceleration rate, so a quick flick counts as much as a long drag.
 * @param {number} velocity
 * @param {number} [rate=0.998]
 */
export function project(velocity, rate = 0.998) {
  'worklet';
  return ((velocity / 1000) * rate) / (1 - rate);
}
