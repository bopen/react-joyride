/* eslint-disable func-names, no-unused-vars */

// This is a local port of https://github.com/olahol/scrollparent.js
// It has been copied here to fix https://github.com/olahol/scrollparent.js/issues/7

const regex = /(auto|scroll)/;

const parents = function(node, ps) {
  if (node.parentNode === null) {
    return ps;
  }

  return parents(node.parentNode, ps.concat([node]));
};

const style = function(node, prop) {
  return getComputedStyle(node, null).getPropertyValue(prop);
};

const overflow = function(node) {
  return (
    style(node, 'overflow')
    + style(node, 'overflow-y')
    + style(node, 'overflow-x')
  );
};

const scroll = function(node) {
  return regex.test(overflow(node));
};

const scrollParent = function(node) {
  if (!(node instanceof HTMLElement || node instanceof SVGElement)) {
    return null;
  }

  // const ps = parents(node.parentNode, []);
  //
  // for (let i = 0; i < ps.length; i += 1) {
  //   if (scroll(ps[i])) {
  //     return ps[i];
  //   }
  // }

  return document.scrollingElement || document.documentElement;
};

export default scrollParent;