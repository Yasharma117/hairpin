// Written by tools/fit_grade.py: do not edit by hand. Per scene: [lift r,g,b, gamma r,g,b, gain r,g,b, saturation].
// The final pass in shared/kit.js applies it, so every scene sits close to the edge painting. See STYLE.md.
export const GRADES = {
  "stand": [
    0.0012,
    -0.065,
    -0.065,
    0.8021,
    0.8803,
    0.9577,
    1.1735,
    1.195,
    1.195,
    1.0883
  ],
  "jorabat": [
    -0.09,
    -0.09,
    -0.0278,
    0.5959,
    0.6354,
    0.7682,
    1.27,
    1.27,
    1.2388,
    1.27
  ],
  "climb": [
    0.0308,
    0.0371,
    -0.045,
    1.36,
    1.36,
    0.9056,
    1.0083,
    0.9946,
    1.02,
    1.135
  ],
  "nongpoh": [
    -0.0497,
    -0.065,
    -0.034,
    0.8009,
    0.8276,
    0.9442,
    1.195,
    1.195,
    1.1931,
    1.1324
  ],
  "cloud": [
    -0.065,
    -0.0384,
    -0.0314,
    1.1032,
    1.1579,
    1.2145,
    1.195,
    1.1482,
    1.0616,
    1.1882
  ],
  "edge": [
    0.0,
    0.0,
    0.0,
    1.0,
    1.0,
    1.0,
    1.0,
    1.0,
    1.0,
    1.0
  ],
  "shillong": [
    0.0,
    0.0,
    0.0,
    1.0,
    1.0,
    1.0,
    1.0,
    1.0,
    1.0,
    1.0
  ]
};
